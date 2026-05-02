from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from routes import auth, parent, ecole, prestataire, admin
import os

app = FastAPI(title="Cantine+ API", version="1.0.0")

@app.get("/health")
def health_check():
    from db import supabase, SUPABASE_KEY
    import uuid
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    # Test d'écriture réel (avec un ID bidon pour la FK)
    write_test = "Non testé"
    try:
        # On tente d'insérer une école avec un user_id inexistant
        # Si c'est une erreur RLS, on aura 42501
        # Si c'est une erreur de FK, on aura 23503 (ce qui prouve que RLS est passé !)
        supabase.table("ecoles").insert({"user_id": str(uuid.uuid4()), "nom": "TEST_DIAGNOSTIC"}).execute()
        write_test = "✅ Succès (incroyable !)"
    except Exception as e:
        write_test = str(e)

    return {
        "status": "online",
        "key_type": "SERVICE_ROLE" if service_key else "ANON",
        "key_prefix": SUPABASE_KEY[:10] if SUPABASE_KEY else "None",
        "write_test_result": write_test,
        "env_check": {
            "has_service_role": bool(service_key),
            "has_supabase_key": bool(os.environ.get("SUPABASE_KEY"))
        }
    }

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"DEBUG Validation Error: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

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
