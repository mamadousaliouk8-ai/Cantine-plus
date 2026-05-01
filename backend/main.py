from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, parent, ecole, prestataire, admin

app = FastAPI(title="Cantine+ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cantine-plus-web.vercel.app",
        "https://cantine-plus.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(parent.router, prefix="/parent", tags=["Parent"])
app.include_router(ecole.router, prefix="/ecole", tags=["École"])
app.include_router(prestataire.router, prefix="/prestataire", tags=["Prestataire"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

@app.get("/")
def root():
    return {"message": "Cantine+ API is running 🚀"}
