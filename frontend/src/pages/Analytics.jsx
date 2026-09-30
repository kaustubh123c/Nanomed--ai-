import { useEffect, useState } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { BarChart3 } from "lucide-react";
import api from "../lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

const INK = "#0B1F3A";
const BEAM = "#00C2FF";
const SIGNAL = "#10B981";
const WARN = "#F59E0B";

const baseOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: INK, font: { family: "Inter" } } } },
  scales: {
    x: { ticks: { color: "#64748b" }, grid: { color: "#e2e8f0" } },
    y: { ticks: { color: "#64748b" }, grid: { color: "#e2e8f0" } },
  },
};

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/analytics/overview").then((res) => setData(res.data));
  }, []);

  if (!data) return <p className="text-ink/40 text-sm">Loading analytics…</p>;

  const empty = data.material_comparison.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
          <BarChart3 className="text-beam" size={24} />
          Analytics
        </h1>
        <p className="text-ink/50 text-sm mt-1">Cross-experiment insights and AI prediction accuracy.</p>
      </div>

      {empty ? (
        <div className="glass-panel-light p-10 rounded-2xl text-center text-ink/40 text-sm">
          Log a few experiments to populate analytics.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Material Comparison">
            <Bar
              data={{
                labels: data.material_comparison.map((d) => d.material),
                datasets: [{ label: "Experiments", data: data.material_comparison.map((d) => d.count), backgroundColor: BEAM }],
              }}
              options={baseOptions}
            />
          </ChartCard>

          <ChartCard title="Detector Usage">
            <Doughnut
              data={{
                labels: data.detector_usage.map((d) => d.detector),
                datasets: [
                  {
                    data: data.detector_usage.map((d) => d.count),
                    backgroundColor: [BEAM, SIGNAL, WARN, INK, "#64748b", "#a78bfa"],
                  },
                ],
              }}
              options={{ plugins: { legend: { position: "bottom", labels: { color: INK } } } }}
            />
          </ChartCard>

          <ChartCard title="Gamma Energy Distribution">
            <Bar
              data={{
                labels: data.gamma_energy_distribution.map((d) => d.bucket),
                datasets: [{ label: "Runs", data: data.gamma_energy_distribution.map((d) => d.count), backgroundColor: WARN }],
              }}
              options={baseOptions}
            />
          </ChartCard>

          <ChartCard title="Experiment Trend">
            <Line
              data={{
                labels: data.experiment_trend.map((d) => d.date),
                datasets: [
                  {
                    label: "Experiments / day",
                    data: data.experiment_trend.map((d) => d.count),
                    borderColor: SIGNAL,
                    backgroundColor: "rgba(16,185,129,0.15)",
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={baseOptions}
            />
          </ChartCard>

          <ChartCard title="AI Prediction Accuracy" span>
            {data.prediction_accuracy.points.length === 0 ? (
              <p className="text-ink/40 text-sm py-10 text-center">Run "Predict" on a logged experiment to populate this chart.</p>
            ) : (
              <>
                <Line
                  data={{
                    labels: data.prediction_accuracy.points.map((_, i) => `#${i + 1}`),
                    datasets: [
                      {
                        label: "Predicted Absorption %",
                        data: data.prediction_accuracy.points.map((p) => p.predicted),
                        borderColor: BEAM,
                        tension: 0.3,
                      },
                      {
                        label: "Actual Absorption %",
                        data: data.prediction_accuracy.points.map((p) => p.actual),
                        borderColor: SIGNAL,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={baseOptions}
                />
                {data.prediction_accuracy.mean_absolute_error_percent !== null && (
                  <p className="text-xs text-ink/50 mt-3">
                    Mean absolute error:{" "}
                    <span className="font-mono text-ink">
                      {data.prediction_accuracy.mean_absolute_error_percent}%
                    </span>
                  </p>
                )}
              </>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, span }) {
  return (
    <div className={`glass-panel-light p-6 rounded-2xl ${span ? "lg:col-span-2" : ""}`}>
      <p className="label-eyebrow text-ink/50 mb-4">{title}</p>
      {children}
    </div>
  );
}
