from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import statistics
from app.core.deps import get_current_user
from app.db.database import repository
from app.models.user import UserOut

router = APIRouter(prefix='/api/research-studio', tags=['Research Studio'])

def now(): return datetime.now(timezone.utc).isoformat()

class ExperimentCreate(BaseModel):
    project_id: Optional[str] = None
    title: str = Field(min_length=1, max_length=200)
    objective: str = ''
    material: str = ''
    energy_kev: Optional[float] = None
    thickness_cm: Optional[float] = None
    detector: str = ''
    notes: str = ''
    status: str = 'Planned'

@router.get('/experiments')
async def list_studio_experiments(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find('studio_experiments', {'owner_id': current_user.id})
    docs.sort(key=lambda d: d.get('updated_at',''), reverse=True)
    return [{**d, 'id': d['_id']} for d in docs]

@router.post('/experiments', status_code=201)
async def create_studio_experiment(payload: ExperimentCreate, current_user: UserOut = Depends(get_current_user)):
    stamp=now(); doc={**payload.model_dump(), 'owner_id':current_user.id,'created_at':stamp,'updated_at':stamp}
    if payload.project_id:
        p=await repository.find_one('research_projects', {'_id':payload.project_id,'owner_id':current_user.id})
        if not p: raise HTTPException(404,'Project not found')
    created=await repository.insert_one('studio_experiments',doc)
    return {**created,'id':created['_id']}

@router.patch('/experiments/{experiment_id}')
async def update_studio_experiment(experiment_id: str, payload: dict, current_user: UserOut = Depends(get_current_user)):
    allowed={k:v for k,v in payload.items() if k in {'title','objective','material','energy_kev','thickness_cm','detector','notes','status'} }
    allowed['updated_at']=now()
    doc=await repository.update_one('studio_experiments', {'_id':experiment_id,'owner_id':current_user.id}, allowed)
    if not doc: raise HTTPException(404,'Experiment not found')
    return {**doc,'id':doc['_id']}

@router.delete('/experiments/{experiment_id}', status_code=204)
async def delete_studio_experiment(experiment_id: str, current_user: UserOut = Depends(get_current_user)):
    if not await repository.delete_one('studio_experiments', {'_id':experiment_id,'owner_id':current_user.id}): raise HTTPException(404,'Experiment not found')

@router.get('/templates')
async def experiment_templates(current_user: UserOut = Depends(get_current_user)):
    return [
      {'id':'attenuation','name':'Gamma attenuation study','objective':'Measure transmission and attenuation versus thickness.','detector':'Geiger-Muller / scintillation counter','fields':['material','energy_kev','thickness_cm']},
      {'id':'energy-sweep','name':'Energy sweep','objective':'Compare attenuation response across a selected energy range.','detector':'Scintillation counter','fields':['material','energy_kev','thickness_cm']},
      {'id':'simulation-validation','name':'Simulation validation','objective':'Compare measured readings against simulated attenuation results.','detector':'Geiger-Muller / scintillation counter','fields':['material','energy_kev','thickness_cm','notes']},
    ]

@router.get('/insights/{file_id}')
async def dataset_insights(file_id: str, current_user: UserOut = Depends(get_current_user)):
    doc=await repository.find_one('research_files', {'_id':file_id,'owner_id':current_user.id})
    if not doc: raise HTTPException(404,'Dataset not found')
    preview=doc.get('preview',[]); cols=doc.get('columns_list',[])
    numeric=[]
    for c in cols:
        vals=[]
        for r in preview:
            try:
                if r.get(c) not in (None,''): vals.append(float(r[c]))
            except: pass
        if vals:
            numeric.append({'column':c,'count':len(vals),'mean':round(statistics.mean(vals),6),'median':round(statistics.median(vals),6),'min':min(vals),'max':max(vals),'stdev':round(statistics.stdev(vals),6) if len(vals)>1 else 0})
    return {'file_id':file_id,'filename':doc.get('filename'),'rows':doc.get('rows',0),'columns':cols,'numeric_summary':numeric,'recommendations':[
      'Check units and detector calibration before comparing runs.',
      'Keep material, energy and thickness metadata with each measurement.',
      'Use the same measurement protocol when validating simulation results.'
    ],'note':'Statistical values are derived from the stored preview (up to 10 rows).'}
