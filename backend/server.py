from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import socketio
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
import requests
import certifi

# Register Unicode CID fonts for Chinese/Japanese/Korean support
try:
    pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))  # Simplified Chinese
    print("✓ Chinese CID font registered successfully")
except Exception as e:
    print(f"Warning: Could not register Chinese font: {e}")

# Register Khmer TrueType font (bundled in repository)
try:
    # Try bundled font first (works on all platforms including Render)
    bundled_font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'KhmerOSsiemreap.ttf')
    system_font_path = '/usr/share/fonts/truetype/khmeros/KhmerOSsiemreap.ttf'
    
    # Use bundled font if available, fallback to system font
    if os.path.exists(bundled_font_path):
        khmer_font_path = bundled_font_path
        print(f"✓ Using bundled Khmer font: {bundled_font_path}")
    elif os.path.exists(system_font_path):
        khmer_font_path = system_font_path
        print(f"✓ Using system Khmer font: {system_font_path}")
    else:
        # Auto-install only in local dev (skip on Render - no sudo access)
        if os.path.exists('/app'):
            print("⚠ Khmer fonts not found. Attempting auto-installation...")
            import subprocess
            try:
                subprocess.run(['apt-get', 'update', '-qq'], check=True, capture_output=True)
                subprocess.run(['apt-get', 'install', '-y', 'fonts-khmeros'], 
                              check=True, capture_output=True, 
                              env={**os.environ, 'DEBIAN_FRONTEND': 'noninteractive'})
                if os.path.exists(system_font_path):
                    khmer_font_path = system_font_path
                    print("✓ Khmer fonts installed successfully via auto-installation")
                else:
                    khmer_font_path = None
            except subprocess.CalledProcessError as e:
                print(f"✗ Auto-installation failed: {e}")
                khmer_font_path = None
            except Exception as e:
                print(f"✗ Auto-installation error: {e}")
                khmer_font_path = None
        else:
            print("⚠ Khmer font files not found - PDF generation for Khmer will fail")
            khmer_font_path = None
    
    # Register font if available
    if khmer_font_path and os.path.exists(khmer_font_path):
        from reportlab.lib.fonts import addMapping
        pdfmetrics.registerFont(TTFont('KhmerOS', khmer_font_path))
        # Also register with lowercase for compatibility
        pdfmetrics.registerFont(TTFont('khmeros', khmer_font_path))
        
        # Register font family mapping so Paragraph can use it properly
        addMapping('KhmerOS', 0, 0, 'KhmerOS')  # normal
        addMapping('KhmerOS', 0, 1, 'KhmerOS')  # italic
        addMapping('KhmerOS', 1, 0, 'KhmerOS')  # bold
        addMapping('KhmerOS', 1, 1, 'KhmerOS')  # bold-italic
        # Also add mapping for lowercase
        addMapping('khmeros', 0, 0, 'khmeros')  # normal
        addMapping('khmeros', 0, 1, 'khmeros')  # italic
        addMapping('khmeros', 1, 0, 'khmeros')  # bold
        addMapping('khmeros', 1, 1, 'khmeros')  # bold-italic
        print("✓ Khmer font registered successfully with family mappings")
    else:
        print("✗ Khmer font not available - PDF generation for Khmer language will fail")
except Exception as e:
    print(f"Warning: Could not register Khmer font: {e}")

# Define allowed origins for CORS (used by both FastAPI and Socket.IO)
ALLOWED_ORIGINS = [
    "https://kostcharge.vercel.app",  # Production Vercel URL
    "http://localhost:3000",  # Local development
]

# Add FRONTEND_URL from env if set and not already in list
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url and frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(frontend_url)

# MongoDB connection with SSL/TLS compatibility
mongo_url = os.environ['MONGO_URL']

# Auto-detect if we need SSL (mongodb+srv:// or production Atlas URLs need it)
use_tls = mongo_url.startswith('mongodb+srv://') or 'mongodb.net' in mongo_url

if use_tls:
    # Production MongoDB Atlas with SSL (Python 3.13+ compatible)
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),  # Required for Python 3.13+ SSL validation
        tlsAllowInvalidCertificates=False,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=20000,
        socketTimeoutMS=20000,
        w='majority',  # Explicit write concern (override URL param)
        retryWrites=True
    )
else:
    # Local development MongoDB without SSL
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ['DB_NAME']]

# Socket.IO setup with explicit CORS origins (no wildcard)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=ALLOWED_ORIGINS)

# Create the main app
app = FastAPI()

# Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "your-secret-key-change-this")

# Password hashing functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT token functions
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Get current user dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user.get("id", payload["sub"]))
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pydantic Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TenantCreate(BaseModel):
    name: str
    room_number: str
    contact: str
    rent_amount: float
    water_price_per_month: float
    electricity_rate_per_kwh: float
    occupants: int = 1
    status: str = "active"

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    room_number: Optional[str] = None
    contact: Optional[str] = None
    rent_amount: Optional[float] = None
    water_price_per_month: Optional[float] = None
    electricity_rate_per_kwh: Optional[float] = None
    occupants: Optional[int] = None
    status: Optional[str] = None

class InvoiceCreate(BaseModel):
    tenant_id: str
    month: int
    year: int
    rent: Optional[float] = None
    electricity_start: Optional[float] = None
    electricity_end: Optional[float] = None
    electricity_rate: Optional[float] = None
    water_occupants: Optional[int] = None
    water_price: Optional[float] = None
    deposit: Optional[float] = None
    currency: str = "IDR"
    notes: Optional[str] = None
    is_draft: bool = False

class InvoiceUpdate(BaseModel):
    rent: Optional[float] = None
    electricity_start: Optional[float] = None
    electricity_end: Optional[float] = None
    electricity_rate: Optional[float] = None
    water_occupants: Optional[int] = None
    water_price: Optional[float] = None
    deposit: Optional[float] = None
    currency: Optional[str] = None
    is_draft: Optional[bool] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class SettingsUpdate(BaseModel):
    default_currency: Optional[str] = None
    default_language: Optional[str] = None

# Helper function to generate invoice serial number
async def generate_invoice_serial(year: int, month: int) -> str:
    year_month = f"{year}{month:02d}"
    count = await db.invoices.count_documents({"year": year, "month": month})
    return f"INV-{year_month}-{(count + 1):04d}"

# Auth endpoints
@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Required for cross-origin cookies
        samesite="none",  # Required for cross-origin cookies
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Required for cross-origin cookies
        samesite="none",  # Required for cross-origin cookies
        max_age=604800,
        path="/"
    )
    
    return {"id": user_id, "email": email, "name": data.name, "role": "user"}

@api_router.post("/auth/login")
async def login(data: LoginRequest, request: Request, response: Response):
    email = data.email.lower()
    
    # Check brute force
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("locked_until")
        if lockout_until and lockout_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {
                    "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15),
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Required for cross-origin cookies
        samesite="none",  # Required for cross-origin cookies
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # Required for cross-origin cookies
        samesite="none",  # Required for cross-origin cookies
        max_age=604800,
        path="/"
    )
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=900,
            path="/"
        )
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Tenant endpoints
@api_router.get("/tenants")
async def get_tenants(user: dict = Depends(get_current_user)):
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    return tenants

@api_router.post("/tenants")
async def create_tenant(data: TenantCreate, user: dict = Depends(get_current_user)):
    tenant_doc = data.model_dump()
    tenant_doc["id"] = str(ObjectId())
    tenant_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    tenant_doc["created_by"] = user["id"]
    
    # Create a copy for insertion
    insert_doc = tenant_doc.copy()
    await db.tenants.insert_one(insert_doc)
    
    # Return the clean doc without _id
    await sio.emit("tenant_created", tenant_doc)
    return tenant_doc

@api_router.get("/tenants/{tenant_id}")
async def get_tenant(tenant_id: str, user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@api_router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    await sio.emit("tenant_updated", tenant)
    return tenant

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, user: dict = Depends(get_current_user)):
    result = await db.tenants.delete_one({"id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    await sio.emit("tenant_deleted", {"id": tenant_id})
    return {"message": "Tenant deleted successfully"}

# Invoice endpoints
@api_router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"tenant_name": {"$regex": search, "$options": "i"}}
        ]
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

@api_router.post("/invoices")
async def create_invoice(data: InvoiceCreate, user: dict = Depends(get_current_user)):
    # Get tenant info
    tenant = await db.tenants.find_one({"id": data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # If it's a draft, allow partial data
    if data.is_draft:
        # For draft, calculate only if all required fields are present
        electricity_usage = 0
        electricity_cost = 0
        water_cost = 0
        total = 0
        
        if data.electricity_start is not None and data.electricity_end is not None and data.electricity_rate is not None:
            electricity_usage = data.electricity_end - data.electricity_start
            electricity_cost = electricity_usage * data.electricity_rate
        
        if data.water_price is not None and data.water_occupants is not None:
            water_cost = data.water_price * data.water_occupants
        
        rent = data.rent or 0
        deposit = data.deposit or 0
        total = rent + electricity_cost + water_cost + deposit
        
        # Generate serial number for draft
        serial_number = f"DRAFT-{str(ObjectId())[:8]}"
        
        invoice_doc = {
            "id": str(ObjectId()),
            "serial_number": serial_number,
            "tenant_id": data.tenant_id,
            "tenant_name": tenant["name"],
            "room_number": tenant["room_number"],
            "month": data.month,
            "year": data.year,
            "rent": data.rent,
            "electricity_start": data.electricity_start,
            "electricity_end": data.electricity_end,
            "electricity_rate": data.electricity_rate,
            "electricity_usage": electricity_usage,
            "electricity_cost": electricity_cost,
            "water_occupants": data.water_occupants,
            "water_price": data.water_price,
            "water_cost": water_cost,
            "deposit": data.deposit,
            "total": total,
            "currency": data.currency,
            "status": "draft",
            "notes": data.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
    else:
        # Validate required fields for final invoice
        if data.rent is None or data.electricity_start is None or data.electricity_end is None or \
           data.electricity_rate is None or data.water_occupants is None or data.water_price is None or \
           data.deposit is None:
            raise HTTPException(status_code=400, detail="All billing fields are required for final invoice")
        
        # Calculate electricity
        electricity_usage = data.electricity_end - data.electricity_start
        electricity_cost = electricity_usage * data.electricity_rate
        
        # Calculate water
        water_cost = data.water_price * data.water_occupants
        
        # Calculate total
        total = data.rent + electricity_cost + water_cost + data.deposit
        
        # Generate serial number
        serial_number = await generate_invoice_serial(data.year, data.month)
        
        invoice_doc = {
            "id": str(ObjectId()),
            "serial_number": serial_number,
            "tenant_id": data.tenant_id,
            "tenant_name": tenant["name"],
            "room_number": tenant["room_number"],
            "month": data.month,
            "year": data.year,
            "rent": data.rent,
            "electricity_start": data.electricity_start,
            "electricity_end": data.electricity_end,
            "electricity_rate": data.electricity_rate,
            "electricity_usage": electricity_usage,
            "electricity_cost": electricity_cost,
            "water_occupants": data.water_occupants,
            "water_price": data.water_price,
            "water_cost": water_cost,
            "deposit": data.deposit,
            "total": total,
            "currency": data.currency,
            "status": "pending",
            "notes": data.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
    
    # Create a copy for insertion
    insert_doc = invoice_doc.copy()
    await db.invoices.insert_one(insert_doc)
    
    # Return the clean doc without _id
    await sio.emit("invoice_created", invoice_doc)
    return invoice_doc

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceUpdate, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # If converting draft to final invoice
    if invoice.get("status") == "draft" and data.is_draft == False:
        # Validate all required fields are present
        rent = update_data.get("rent", invoice.get("rent"))
        elec_start = update_data.get("electricity_start", invoice.get("electricity_start"))
        elec_end = update_data.get("electricity_end", invoice.get("electricity_end"))
        elec_rate = update_data.get("electricity_rate", invoice.get("electricity_rate"))
        water_occupants = update_data.get("water_occupants", invoice.get("water_occupants"))
        water_price = update_data.get("water_price", invoice.get("water_price"))
        deposit = update_data.get("deposit", invoice.get("deposit"))
        
        if None in [rent, elec_start, elec_end, elec_rate, water_occupants, water_price, deposit]:
            raise HTTPException(status_code=400, detail="All billing fields are required to finalize invoice")
        
        # Calculate totals
        electricity_usage = elec_end - elec_start
        electricity_cost = electricity_usage * elec_rate
        water_cost = water_price * water_occupants
        total = rent + electricity_cost + water_cost + deposit
        
        # Generate proper serial number
        serial_number = await generate_invoice_serial(invoice["year"], invoice["month"])
        
        update_data["electricity_usage"] = electricity_usage
        update_data["electricity_cost"] = electricity_cost
        update_data["water_cost"] = water_cost
        update_data["total"] = total
        update_data["status"] = "pending"
        update_data["serial_number"] = serial_number
    
    # Recalculate if billing components changed (for both draft and non-draft)
    elif any(k in update_data for k in ["rent", "electricity_start", "electricity_end", "electricity_rate", "water_occupants", "water_price", "deposit"]):
        rent = update_data.get("rent", invoice.get("rent", 0))
        elec_start = update_data.get("electricity_start", invoice.get("electricity_start"))
        elec_end = update_data.get("electricity_end", invoice.get("electricity_end"))
        elec_rate = update_data.get("electricity_rate", invoice.get("electricity_rate"))
        water_occupants = update_data.get("water_occupants", invoice.get("water_occupants"))
        water_price = update_data.get("water_price", invoice.get("water_price"))
        deposit = update_data.get("deposit", invoice.get("deposit", 0))
        
        # Only calculate if we have the necessary values
        electricity_usage = 0
        electricity_cost = 0
        water_cost = 0
        
        if elec_start is not None and elec_end is not None and elec_rate is not None:
            electricity_usage = elec_end - elec_start
            electricity_cost = electricity_usage * elec_rate
        
        if water_occupants is not None and water_price is not None:
            water_cost = water_price * water_occupants
        
        total = (rent or 0) + electricity_cost + water_cost + (deposit or 0)
        
        update_data["electricity_usage"] = electricity_usage
        update_data["electricity_cost"] = electricity_cost
        update_data["water_cost"] = water_cost
        update_data["total"] = total
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    await sio.emit("invoice_updated", updated_invoice)
    return updated_invoice

@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, user: dict = Depends(get_current_user)):
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    await sio.emit("invoice_status_changed", invoice)
    return invoice

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await sio.emit("invoice_deleted", {"id": invoice_id})
    return {"message": "Invoice deleted successfully"}

# PDF Generation
@api_router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: str, lang: Optional[str] = None, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Prevent PDF generation for drafts
    if invoice.get("status") == "draft":
        raise HTTPException(status_code=400, detail="Cannot generate PDF for draft invoice. Please finalize the invoice first.")
    
    # Priority: 1. Query param from frontend, 2. User settings from DB, 3. Default 'id'
    if not lang:
        settings = await db.settings.find_one({"user_id": user["id"]}, {"_id": 0})
        lang = settings.get("default_language", "id") if settings else "id"
    
    # Translation dictionary for PDF
    translations = {
        "id": {
            "invoice": "TAGIHAN",
            "invoice_number": "Nomor Tagihan:",
            "date": "Tanggal:",
            "tenant": "Penyewa:",
            "room": "Kamar:",
            "period": "Periode:",
            "currency": "Mata Uang:",
            "description": "Keterangan",
            "details": "Detail",
            "amount": "Jumlah",
            "rent": "Sewa",
            "electricity": "Listrik",
            "water": "Air",
            "deposit": "Deposit",
            "total": "TOTAL",
            "notes": "Catatan:",
            "status": "Status:",
            "paid": "LUNAS",
            "pending": "PENDING",
            "overdue": "LEWAT JATUH TEMPO",
            "occupants": "penghuni"
        },
        "en": {
            "invoice": "INVOICE",
            "invoice_number": "Invoice Number:",
            "date": "Date:",
            "tenant": "Tenant:",
            "room": "Room:",
            "period": "Period:",
            "currency": "Currency:",
            "description": "Description",
            "details": "Details",
            "amount": "Amount",
            "rent": "Rent",
            "electricity": "Electricity",
            "water": "Water",
            "deposit": "Deposit",
            "total": "TOTAL",
            "notes": "Notes:",
            "status": "Status:",
            "paid": "PAID",
            "pending": "PENDING",
            "overdue": "OVERDUE",
            "occupants": "occupants"
        },
        "zh": {
            "invoice": "发票",
            "invoice_number": "发票号码：",
            "date": "日期：",
            "tenant": "租户：",
            "room": "房间：",
            "period": "期间：",
            "currency": "货币：",
            "description": "说明",
            "details": "详情",
            "amount": "金额",
            "rent": "租金",
            "electricity": "电费",
            "water": "水费",
            "deposit": "押金",
            "total": "总计",
            "notes": "备注：",
            "status": "状态：",
            "paid": "已付",
            "pending": "待付",
            "overdue": "逾期",
            "occupants": "居住人数"
        },
        "km": {
            "invoice": "វិក្កយបត្រ",
            "invoice_number": "លេខវិក្កយបត្រ:",
            "date": "កាលបរិច្ឆេទ:",
            "tenant": "អ្នកជួល:",
            "room": "បន្ទប់:",
            "period": "រយៈពេល:",
            "currency": "រូបិយប័ណ្ណ:",
            "description": "ការពិពណ៌នា",
            "details": "ព័ត៌មានលម្អិត",
            "amount": "ចំនួនទឹកប្រាក់",
            "rent": "ថ្លៃជួល",
            "electricity": "អគ្គិសនី",
            "water": "ទឹក",
            "deposit": "បញ្ញើប្រាក់",
            "total": "សរុប",
            "notes": "កំណត់ចំណាំ:",
            "status": "ស្ថានភាព:",
            "paid": "បានបង់",
            "pending": "រងចាំ",
            "overdue": "ហួសកំណត់",
            "occupants": "អ្នករស់នៅ"
        }
    }
    
    # Get translations for selected language
    t = translations.get(lang, translations["id"])
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    
    # Use appropriate font for each language
    if lang == 'zh':
        base_font = 'STSong-Light'
        bold_font = 'STSong-Light'
    elif lang == 'km':
        base_font = 'KhmerOS'
        bold_font = 'KhmerOS'
    else:
        base_font = 'Helvetica'
        bold_font = 'Helvetica-Bold'
    
    styles = getSampleStyleSheet()
    
    # For Khmer, use simpler style without bold to avoid font family mapping issues
    if lang == 'km':
        title_style = ParagraphStyle(
            'CustomTitle',
            fontName=base_font,  # Use base font, not bold
            fontSize=24,
            textColor=colors.HexColor('#020617'),
            spaceAfter=30,
            alignment=TA_CENTER,
            leading=30  # Line height for Khmer
        )
    else:
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            fontName=bold_font,
            textColor=colors.HexColor('#020617'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
    
    story = []
    
    # Logo
    try:
        logo_url = "https://customer-assets.emergentagent.com/job_kostcharge/artifacts/mjhfiq2c_brand.png"
        logo_response = requests.get(logo_url, timeout=5)
        if logo_response.status_code == 200:
            logo_buffer = BytesIO(logo_response.content)
            logo = Image(logo_buffer, width=1.2*inch, height=1.2*inch)
            story.append(logo)
            story.append(Spacer(1, 0.1 * inch))
    except Exception as e:
        print(f"Could not load logo: {e}")
    
    # Title
    story.append(Paragraph(t["invoice"], title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Invoice details
    invoice_info = [
        [t["invoice_number"], invoice["serial_number"]],
        [t["date"], datetime.fromisoformat(invoice["created_at"]).strftime("%d/%m/%Y")],
        [t["tenant"], invoice["tenant_name"]],
        [t["room"], invoice["room_number"]],
        [t["period"], f"{invoice['month']:02d}/{invoice['year']}"],
        [t["currency"], invoice["currency"]]
    ]
    
    info_table = Table(invoice_info, colWidths=[2 * inch, 4 * inch])
    # For Khmer, use base_font for all cells to avoid bold font family issues
    if lang == 'km':
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), base_font, 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#020617')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
    else:
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), base_font, 10),
            ('FONT', (0, 0), (0, -1), bold_font, 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#020617')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
    story.append(info_table)
    story.append(Spacer(1, 0.3 * inch))
    
    # Billing breakdown
    billing_data = [
        [t["description"], t["details"], t["amount"]],
        [t["rent"], "-", f"$ {invoice['rent']:,.2f}"],
        [t["electricity"], f"{invoice['electricity_start']} → {invoice['electricity_end']} kWh × $ {invoice['electricity_rate']}", f"$ {invoice['electricity_cost']:,.2f}"],
        [t["water"], f"{invoice['water_occupants']} {t['occupants']} × $ {invoice['water_price']}", f"$ {invoice['water_cost']:,.2f}"],
        [t["deposit"], "-", f"$ {invoice['deposit']:,.2f}"],
        ["", t["total"], f"$ {invoice['total']:,.2f}"]
    ]
    
    billing_table = Table(billing_data, colWidths=[2 * inch, 2.5 * inch, 1.5 * inch])
    # For Khmer, use base_font to avoid bold font family issues
    if lang == 'km':
        billing_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), base_font, 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#020617')),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (1, -1), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
    else:
        billing_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, 0), bold_font, 11),
            ('FONT', (0, 1), (-1, -2), base_font, 10),
            ('FONT', (1, -1), (-1, -1), bold_font, 12),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#020617')),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('ALIGN', (1, -1), (1, -1), 'RIGHT'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
    story.append(billing_table)
    
    # Notes if any
    if invoice.get("notes"):
        story.append(Spacer(1, 0.3 * inch))
        # For Khmer, don't use parent style to avoid font family issues
        if lang == 'km':
            notes_style = ParagraphStyle('Notes', fontName=base_font, fontSize=9, textColor=colors.HexColor('#475569'))
            story.append(Paragraph(f"{t['notes']} {invoice['notes']}", notes_style))
        else:
            notes_style = ParagraphStyle('Notes', parent=styles['Normal'], fontName=base_font, fontSize=9, textColor=colors.HexColor('#475569'))
            story.append(Paragraph(f"<b>{t['notes']}</b> {invoice['notes']}", notes_style))
    
    # Status
    story.append(Spacer(1, 0.3 * inch))
    status_color = "#16A34A" if invoice["status"] == "paid" else "#EAB308" if invoice["status"] == "pending" else "#DC2626"
    # For Khmer, use base_font and no parent style to avoid font family issues
    if lang == 'km':
        status_style = ParagraphStyle('Status', fontName=base_font, fontSize=11, textColor=colors.HexColor(status_color), alignment=TA_CENTER)
        status_text = t["paid"] if invoice["status"] == "paid" else t["pending"] if invoice["status"] == "pending" else t["overdue"]
        story.append(Paragraph(f"{t['status']} {status_text}", status_style))
    else:
        status_style = ParagraphStyle('Status', parent=styles['Normal'], fontName=bold_font, fontSize=11, textColor=colors.HexColor(status_color), alignment=TA_CENTER)
        status_text = t["paid"] if invoice["status"] == "paid" else t["pending"] if invoice["status"] == "pending" else t["overdue"]
        story.append(Paragraph(f"<b>{t['status']} {status_text}</b>", status_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice['serial_number']}.pdf"}
    )

# Settings endpoints
@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        settings = {
            "user_id": user["id"],
            "default_currency": "IDR",
            "default_language": "id"
        }
        # Create a copy for insertion
        insert_doc = settings.copy()
        await db.settings.insert_one(insert_doc)
    return settings

@api_router.put("/settings")
async def update_settings(data: SettingsUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.settings.update_one(
        {"user_id": user["id"]},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"user_id": user["id"]}, {"_id": 0})
    return settings

# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_tenants = await db.tenants.count_documents({"status": "active"})
    total_invoices = await db.invoices.count_documents({})
    pending_invoices = await db.invoices.count_documents({"status": "pending"})
    overdue_invoices = await db.invoices.count_documents({"status": "overdue"})
    
    # Calculate total uncollected
    pipeline = [
        {"$match": {"status": {"$in": ["pending", "overdue"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    uncollected = await db.invoices.aggregate(pipeline).to_list(1)
    total_uncollected = uncollected[0]["total"] if uncollected else 0
    
    # Recent invoices
    recent_invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_tenants": total_tenants,
        "total_invoices": total_invoices,
        "pending_invoices": pending_invoices,
        "overdue_invoices": overdue_invoices,
        "total_uncollected": total_uncollected,
        "recent_invoices": recent_invoices
    }

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration (use the same allowed origins as Socket.IO)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,  # CRITICAL: Allow cookies in cross-origin requests
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin seeding
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kostcharge.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Write test credentials (use /tmp on Render, /app locally)
    memory_dir = "/tmp/memory" if not os.path.exists("/app") else "/app/memory"
    os.makedirs(memory_dir, exist_ok=True)
    with open(f"{memory_dir}/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")

# Create indexes
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tenants.create_index("id", unique=True)
    await db.invoices.create_index("id", unique=True)
    await db.invoices.create_index("serial_number", unique=True)

@app.on_event("startup")
async def startup_event():
    await seed_admin()
    await create_indexes()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
