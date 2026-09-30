# Chatbot source merge

The embedded NanoMed chatbot UI was replaced with the chatbot interface from the uploaded `NamoMed-AI-share(1).zip`.

The UI calls the current FastAPI chatbot endpoints:
- POST /api/chatbot/chat
- GET/DELETE /api/chatbot/history
- POST /api/chatbot/upload-pdf
- GET /api/chatbot/pdf-status
- DELETE /api/chatbot/pdf

The rest of the current NanoMed full-stack application is preserved.
