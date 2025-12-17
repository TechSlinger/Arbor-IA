from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import hashlib
import uuid
import pymysql
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ArborIA API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MySQL connection configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "arboria_db")

@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = pymysql.connect(
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def generate_id():
    return str(uuid.uuid4())

# Pydantic Models
class GPSCoords(BaseModel):
    latitude: float
    longitude: float

class Farm(BaseModel):
    name: str
    gps_coords: Optional[GPSCoords] = None
    grid_rows: int = 20
    grid_cols: int = 20
    description: Optional[str] = None

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    gps_coords: Optional[GPSCoords] = None
    grid_rows: Optional[int] = None
    grid_cols: Optional[int] = None
    description: Optional[str] = None

class Tree(BaseModel):
    farm_id: str
    position: str
    species: str
    variety: Optional[str] = None
    plant_date: str
    health: str = "good"
    notes: Optional[str] = None
    photo: Optional[str] = None
    gps_coords: Optional[GPSCoords] = None
    synced: bool = True
    origin: Optional[str] = None

class TreeUpdate(BaseModel):
    position: Optional[str] = None
    species: Optional[str] = None
    variety: Optional[str] = None
    plant_date: Optional[str] = None
    health: Optional[str] = None
    notes: Optional[str] = None
    photo: Optional[str] = None
    gps_coords: Optional[GPSCoords] = None
    synced: Optional[bool] = None
    origin: Optional[str] = None

class Intervention(BaseModel):
    tree_id: str
    type: str
    notes: Optional[str] = None
    date: Optional[str] = None

class UserRegister(BaseModel):
    phone: str
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class DuplicateTree(BaseModel):
    source_tree_id: str
    target_position: str
    target_farm_id: Optional[str] = None

class SyncBatch(BaseModel):
    trees: List[dict]

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "ArborIA API - Gestion Arboricole (MySQL)", "version": "2.1.0"}

# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/register")
def register_user(user: UserRegister):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE phone = %s", (user.phone,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")
        
        user_id = generate_id()
        cursor.execute(
            "INSERT INTO users (id, phone, password_hash) VALUES (%s, %s, %s)",
            (user_id, user.phone, hash_password(user.password))
        )
        
        return {
            "id": user_id,
            "phone": user.phone,
            "message": "Inscription réussie"
        }

@app.post("/api/auth/login")
def login_user(user: UserLogin):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, phone, password_hash FROM users WHERE phone = %s", (user.phone,))
        db_user = cursor.fetchone()
        
        if not db_user or db_user["password_hash"] != hash_password(user.password):
            raise HTTPException(status_code=401, detail="Numéro de téléphone ou mot de passe incorrect")
        
        return {
            "id": db_user["id"],
            "phone": db_user["phone"],
            "message": "Connexion réussie"
        }

@app.get("/api/auth/demo")
def demo_login():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, phone FROM users WHERE phone = 'demo'")
        demo_user = cursor.fetchone()
        
        if not demo_user:
            user_id = generate_id()
            cursor.execute(
                "INSERT INTO users (id, phone, password_hash, is_demo) VALUES (%s, 'demo', %s, TRUE)",
                (user_id, hash_password("demo123"))
            )
            return {"id": user_id, "phone": "demo", "is_demo": True, "message": "Connexion démo réussie"}
        
        return {"id": demo_user["id"], "phone": "demo", "is_demo": True, "message": "Connexion démo réussie"}

# ============== FARM ENDPOINTS ==============

@app.post("/api/farms")
def create_farm(farm: Farm):
    with get_db() as conn:
        cursor = conn.cursor()
        farm_id = generate_id()
        now = datetime.utcnow()
        
        gps_lat = farm.gps_coords.latitude if farm.gps_coords else None
        gps_lng = farm.gps_coords.longitude if farm.gps_coords else None
        
        cursor.execute("""
            INSERT INTO farms (id, name, description, grid_rows, grid_cols, gps_latitude, gps_longitude, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (farm_id, farm.name, farm.description, farm.grid_rows, farm.grid_cols, gps_lat, gps_lng, now, now))
        
        return {
            "id": farm_id,
            "name": farm.name,
            "description": farm.description,
            "grid_rows": farm.grid_rows,
            "grid_cols": farm.grid_cols,
            "gps_coords": farm.gps_coords.dict() if farm.gps_coords else None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "message": "Ferme créée avec succès"
        }

@app.get("/api/farms")
def get_farms():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM farms ORDER BY created_at DESC")
        farms = cursor.fetchall()
        
        result = []
        for farm in farms:
            gps_coords = None
            if farm["gps_latitude"] and farm["gps_longitude"]:
                gps_coords = {"latitude": farm["gps_latitude"], "longitude": farm["gps_longitude"]}
            
            result.append({
                "id": farm["id"],
                "name": farm["name"],
                "description": farm["description"],
                "grid_rows": farm["grid_rows"],
                "grid_cols": farm["grid_cols"],
                "gps_coords": gps_coords,
                "created_at": farm["created_at"].isoformat() if farm["created_at"] else None,
                "updated_at": farm["updated_at"].isoformat() if farm["updated_at"] else None
            })
        
        return result

@app.get("/api/farms/{farm_id}")
def get_farm(farm_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM farms WHERE id = %s", (farm_id,))
        farm = cursor.fetchone()
        
        if not farm:
            raise HTTPException(status_code=404, detail="Ferme non trouvée")
        
        gps_coords = None
        if farm["gps_latitude"] and farm["gps_longitude"]:
            gps_coords = {"latitude": farm["gps_latitude"], "longitude": farm["gps_longitude"]}
        
        return {
            "id": farm["id"],
            "name": farm["name"],
            "description": farm["description"],
            "grid_rows": farm["grid_rows"],
            "grid_cols": farm["grid_cols"],
            "gps_coords": gps_coords,
            "created_at": farm["created_at"].isoformat() if farm["created_at"] else None,
            "updated_at": farm["updated_at"].isoformat() if farm["updated_at"] else None
        }

@app.put("/api/farms/{farm_id}")
def update_farm(farm_id: str, farm_update: FarmUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM farms WHERE id = %s", (farm_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Ferme non trouvée")
        
        updates = []
        values = []
        
        if farm_update.name is not None:
            updates.append("name = %s")
            values.append(farm_update.name)
        if farm_update.description is not None:
            updates.append("description = %s")
            values.append(farm_update.description)
        if farm_update.grid_rows is not None:
            updates.append("grid_rows = %s")
            values.append(farm_update.grid_rows)
        if farm_update.grid_cols is not None:
            updates.append("grid_cols = %s")
            values.append(farm_update.grid_cols)
        if farm_update.gps_coords is not None:
            updates.append("gps_latitude = %s")
            updates.append("gps_longitude = %s")
            values.append(farm_update.gps_coords.latitude)
            values.append(farm_update.gps_coords.longitude)
        
        if updates:
            updates.append("updated_at = %s")
            values.append(datetime.utcnow())
            values.append(farm_id)
            
            cursor.execute(f"UPDATE farms SET {', '.join(updates)} WHERE id = %s", values)
        
        return get_farm(farm_id)

@app.delete("/api/farms/{farm_id}")
def delete_farm(farm_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM farms WHERE id = %s", (farm_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Ferme non trouvée")
        
        # Les arbres et interventions sont supprimés automatiquement via CASCADE
        cursor.execute("DELETE FROM farms WHERE id = %s", (farm_id,))
        
        return {"message": "Ferme et arbres associés supprimés avec succès", "success": True}

# ============== TREE ENDPOINTS ==============

@app.post("/api/trees")
def create_tree(tree: Tree):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if position exists
        cursor.execute(
            "SELECT id FROM trees WHERE farm_id = %s AND position = %s",
            (tree.farm_id, tree.position)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Un arbre existe déjà à la position {tree.position}")
        
        tree_id = generate_id()
        now = datetime.utcnow()
        
        gps_lat = tree.gps_coords.latitude if tree.gps_coords else None
        gps_lng = tree.gps_coords.longitude if tree.gps_coords else None
        
        cursor.execute("""
            INSERT INTO trees (id, farm_id, position, species, variety, plant_date, health, notes, photo, origin, gps_latitude, gps_longitude, synced, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (tree_id, tree.farm_id, tree.position, tree.species, tree.variety, tree.plant_date, tree.health, tree.notes, tree.photo, tree.origin, gps_lat, gps_lng, tree.synced, now, now))
        
        # Add photo to tree_photos if provided
        if tree.photo:
            photo_id = generate_id()
            cursor.execute(
                "INSERT INTO tree_photos (id, tree_id, photo) VALUES (%s, %s, %s)",
                (photo_id, tree_id, tree.photo)
            )
        
        return {
            "id": tree_id,
            "farm_id": tree.farm_id,
            "position": tree.position,
            "species": tree.species,
            "variety": tree.variety,
            "plant_date": tree.plant_date,
            "health": tree.health,
            "notes": tree.notes,
            "photo": tree.photo,
            "photos": [tree.photo] if tree.photo else [],
            "origin": tree.origin,
            "gps_coords": tree.gps_coords.dict() if tree.gps_coords else None,
            "synced": tree.synced,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "message": "Arbre créé avec succès"
        }

def format_tree(tree, photos=None):
    gps_coords = None
    if tree.get("gps_latitude") and tree.get("gps_longitude"):
        gps_coords = {"latitude": tree["gps_latitude"], "longitude": tree["gps_longitude"]}
    
    plant_date = tree.get("plant_date")
    if plant_date and hasattr(plant_date, 'isoformat'):
        plant_date = plant_date.isoformat()
    
    return {
        "id": tree["id"],
        "farm_id": tree["farm_id"],
        "position": tree["position"],
        "species": tree["species"],
        "variety": tree.get("variety"),
        "plant_date": str(plant_date) if plant_date else None,
        "health": tree["health"],
        "notes": tree.get("notes"),
        "photo": tree.get("photo"),
        "photos": photos or [],
        "origin": tree.get("origin"),
        "gps_coords": gps_coords,
        "synced": bool(tree.get("synced", True)),
        "created_at": tree["created_at"].isoformat() if tree.get("created_at") else None,
        "updated_at": tree["updated_at"].isoformat() if tree.get("updated_at") else None
    }

@app.get("/api/trees")
def get_trees(farm_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        
        if farm_id:
            cursor.execute("SELECT * FROM trees WHERE farm_id = %s ORDER BY position", (farm_id,))
        else:
            cursor.execute("SELECT * FROM trees ORDER BY created_at DESC")
        
        trees = cursor.fetchall()
        
        result = []
        for tree in trees:
            cursor.execute("SELECT photo FROM tree_photos WHERE tree_id = %s", (tree["id"],))
            photos = [p["photo"] for p in cursor.fetchall()]
            result.append(format_tree(tree, photos))
        
        return result

@app.get("/api/trees/{tree_id}")
def get_tree(tree_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trees WHERE id = %s", (tree_id,))
        tree = cursor.fetchone()
        
        if not tree:
            raise HTTPException(status_code=404, detail="Arbre non trouvé")
        
        cursor.execute("SELECT photo FROM tree_photos WHERE tree_id = %s", (tree_id,))
        photos = [p["photo"] for p in cursor.fetchall()]
        
        return format_tree(tree, photos)

@app.put("/api/trees/{tree_id}")
def update_tree(tree_id: str, tree_update: TreeUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM trees WHERE id = %s", (tree_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Arbre non trouvé")
        
        updates = []
        values = []
        
        if tree_update.position is not None:
            updates.append("position = %s")
            values.append(tree_update.position)
        if tree_update.species is not None:
            updates.append("species = %s")
            values.append(tree_update.species)
        if tree_update.variety is not None:
            updates.append("variety = %s")
            values.append(tree_update.variety)
        if tree_update.plant_date is not None:
            updates.append("plant_date = %s")
            values.append(tree_update.plant_date)
        if tree_update.health is not None:
            updates.append("health = %s")
            values.append(tree_update.health)
        if tree_update.notes is not None:
            updates.append("notes = %s")
            values.append(tree_update.notes)
        if tree_update.photo is not None:
            updates.append("photo = %s")
            values.append(tree_update.photo)
        if tree_update.origin is not None:
            updates.append("origin = %s")
            values.append(tree_update.origin)
        if tree_update.gps_coords is not None:
            updates.append("gps_latitude = %s")
            updates.append("gps_longitude = %s")
            values.append(tree_update.gps_coords.latitude)
            values.append(tree_update.gps_coords.longitude)
        if tree_update.synced is not None:
            updates.append("synced = %s")
            values.append(tree_update.synced)
        
        if updates:
            updates.append("updated_at = %s")
            values.append(datetime.utcnow())
            values.append(tree_id)
            
            cursor.execute(f"UPDATE trees SET {', '.join(updates)} WHERE id = %s", values)
        
        result = get_tree(tree_id)
        result["message"] = "Arbre modifié avec succès"
        return result

@app.delete("/api/trees/{tree_id}")
def delete_tree(tree_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM trees WHERE id = %s", (tree_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Arbre non trouvé")
        
        cursor.execute("DELETE FROM trees WHERE id = %s", (tree_id,))
        
        return {"message": "Arbre supprimé avec succès", "success": True}

# ============== DUPLICATE TREE ==============

@app.post("/api/trees/duplicate")
def duplicate_tree(data: DuplicateTree):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM trees WHERE id = %s", (data.source_tree_id,))
        source = cursor.fetchone()
        
        if not source:
            raise HTTPException(status_code=404, detail="Arbre source non trouvé")
        
        target_farm_id = data.target_farm_id or source["farm_id"]
        
        cursor.execute(
            "SELECT id FROM trees WHERE farm_id = %s AND position = %s",
            (target_farm_id, data.target_position)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"La position {data.target_position} est déjà occupée")
        
        tree_id = generate_id()
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO trees (id, farm_id, position, species, variety, plant_date, health, notes, origin, synced, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'good', %s, %s, TRUE, %s, %s)
        """, (tree_id, target_farm_id, data.target_position, source["species"], source["variety"], 
              now.date(), f"Dupliqué de {source['position']}", source["origin"], now, now))
        
        return {
            "id": tree_id,
            "farm_id": target_farm_id,
            "position": data.target_position,
            "species": source["species"],
            "variety": source["variety"],
            "plant_date": str(now.date()),
            "health": "good",
            "notes": f"Dupliqué de {source['position']}",
            "origin": source["origin"],
            "photos": [],
            "synced": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "message": "Arbre dupliqué avec succès"
        }

# ============== INTERVENTION ENDPOINTS ==============

@app.post("/api/interventions")
def create_intervention(intervention: Intervention):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM trees WHERE id = %s", (intervention.tree_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Arbre non trouvé")
        
        int_id = generate_id()
        int_date = intervention.date or datetime.utcnow().isoformat()
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO interventions (id, tree_id, type, notes, date, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (int_id, intervention.tree_id, intervention.type, intervention.notes, int_date, now))
        
        return {
            "id": int_id,
            "tree_id": intervention.tree_id,
            "type": intervention.type,
            "notes": intervention.notes,
            "date": int_date,
            "created_at": now.isoformat(),
            "message": "Intervention ajoutée avec succès"
        }

@app.get("/api/interventions")
def get_interventions(tree_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        
        if tree_id:
            cursor.execute("SELECT * FROM interventions WHERE tree_id = %s ORDER BY date DESC", (tree_id,))
        else:
            cursor.execute("SELECT * FROM interventions ORDER BY date DESC")
        
        interventions = cursor.fetchall()
        
        return [{
            "id": i["id"],
            "tree_id": i["tree_id"],
            "type": i["type"],
            "notes": i["notes"],
            "date": i["date"].isoformat() if i["date"] else None,
            "created_at": i["created_at"].isoformat() if i["created_at"] else None
        } for i in interventions]

@app.delete("/api/interventions/{intervention_id}")
def delete_intervention(intervention_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM interventions WHERE id = %s", (intervention_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Intervention non trouvée")
        
        cursor.execute("DELETE FROM interventions WHERE id = %s", (intervention_id,))
        
        return {"message": "Intervention supprimée avec succès", "success": True}

# ============== PHOTO ENDPOINTS ==============

@app.post("/api/trees/{tree_id}/photos")
def add_photo(tree_id: str, photo_data: dict):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM trees WHERE id = %s", (tree_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Arbre non trouvé")
        
        if photo_data.get("photo"):
            photo_id = generate_id()
            cursor.execute(
                "INSERT INTO tree_photos (id, tree_id, photo) VALUES (%s, %s, %s)",
                (photo_id, tree_id, photo_data["photo"])
            )
            
            # Update main photo
            cursor.execute(
                "UPDATE trees SET photo = %s, updated_at = %s WHERE id = %s",
                (photo_data["photo"], datetime.utcnow(), tree_id)
            )
        
        cursor.execute("SELECT COUNT(*) as count FROM tree_photos WHERE tree_id = %s", (tree_id,))
        count = cursor.fetchone()["count"]
        
        return {"message": "Photo ajoutée avec succès", "photo_count": count, "success": True}

@app.delete("/api/trees/{tree_id}/photos/{photo_index}")
def delete_photo(tree_id: str, photo_index: int):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM tree_photos WHERE tree_id = %s ORDER BY created_at", (tree_id,))
        photos = cursor.fetchall()
        
        if photo_index < 0 or photo_index >= len(photos):
            raise HTTPException(status_code=400, detail="Index de photo invalide")
        
        photo_id = photos[photo_index]["id"]
        cursor.execute("DELETE FROM tree_photos WHERE id = %s", (photo_id,))
        
        # Update main photo
        cursor.execute("SELECT photo FROM tree_photos WHERE tree_id = %s ORDER BY created_at DESC LIMIT 1", (tree_id,))
        last_photo = cursor.fetchone()
        cursor.execute(
            "UPDATE trees SET photo = %s, updated_at = %s WHERE id = %s",
            (last_photo["photo"] if last_photo else None, datetime.utcnow(), tree_id)
        )
        
        return {"message": "Photo supprimée avec succès", "photo_count": len(photos) - 1, "success": True}

# ============== SEARCH ENDPOINT ==============

@app.get("/api/search")
def search_trees(
    farm_id: Optional[str] = None,
    query: Optional[str] = None,
    health: Optional[str] = None,
    species: Optional[str] = None
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        sql = "SELECT * FROM trees WHERE 1=1"
        params = []
        
        if farm_id:
            sql += " AND farm_id = %s"
            params.append(farm_id)
        
        if health and health != "all":
            sql += " AND health = %s"
            params.append(health)
        
        if species:
            sql += " AND species LIKE %s"
            params.append(f"%{species}%")
        
        if query:
            sql += " AND (species LIKE %s OR variety LIKE %s OR position LIKE %s OR notes LIKE %s)"
            params.extend([f"%{query}%"] * 4)
        
        cursor.execute(sql, params)
        trees = cursor.fetchall()
        
        result = []
        for tree in trees:
            cursor.execute("SELECT photo FROM tree_photos WHERE tree_id = %s", (tree["id"],))
            photos = [p["photo"] for p in cursor.fetchall()]
            result.append(format_tree(tree, photos))
        
        return result

# ============== STATISTICS ENDPOINT ==============

@app.get("/api/statistics/{farm_id}")
def get_statistics(farm_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM trees WHERE farm_id = %s", (farm_id,))
        trees = cursor.fetchall()
        
        stats = {
            "total": len(trees),
            "good": 0, "fair": 0, "poor": 0, "dead": 0,
            "species_count": {},
            "recent_plantings": 0,
            "total_interventions": 0,
            "interventions_by_type": {}
        }
        
        tree_ids = [t["id"] for t in trees]
        
        for tree in trees:
            health = tree.get("health", "good")
            stats[health] = stats.get(health, 0) + 1
            
            species = tree.get("species", "Unknown")
            stats["species_count"][species] = stats["species_count"].get(species, 0) + 1
            
            plant_date = tree.get("plant_date")
            if plant_date:
                try:
                    if hasattr(plant_date, 'date'):
                        plant_date = plant_date
                    else:
                        plant_date = datetime.fromisoformat(str(plant_date).replace('Z', ''))
                    days_diff = (datetime.now() - datetime.combine(plant_date, datetime.min.time())).days
                    if days_diff <= 30:
                        stats["recent_plantings"] += 1
                except:
                    pass
        
        if tree_ids:
            placeholders = ','.join(['%s'] * len(tree_ids))
            cursor.execute(f"SELECT type, COUNT(*) as count FROM interventions WHERE tree_id IN ({placeholders}) GROUP BY type", tree_ids)
            for row in cursor.fetchall():
                stats["interventions_by_type"][row["type"]] = row["count"]
                stats["total_interventions"] += row["count"]
        
        return stats

# ============== EXPORT/IMPORT ENDPOINTS ==============

@app.get("/api/export")
def export_data(farm_id: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        
        if farm_id:
            cursor.execute("SELECT * FROM farms WHERE id = %s", (farm_id,))
        else:
            cursor.execute("SELECT * FROM farms")
        farms = cursor.fetchall()
        
        if farm_id:
            cursor.execute("SELECT * FROM trees WHERE farm_id = %s", (farm_id,))
        else:
            cursor.execute("SELECT * FROM trees")
        trees = cursor.fetchall()
        
        tree_ids = [t["id"] for t in trees]
        interventions = []
        if tree_ids:
            placeholders = ','.join(['%s'] * len(tree_ids))
            cursor.execute(f"SELECT * FROM interventions WHERE tree_id IN ({placeholders})", tree_ids)
            interventions = cursor.fetchall()
        
        # Format data
        farms_data = []
        for f in farms:
            gps = None
            if f.get("gps_latitude") and f.get("gps_longitude"):
                gps = {"latitude": f["gps_latitude"], "longitude": f["gps_longitude"]}
            farms_data.append({
                "id": f["id"], "name": f["name"], "description": f["description"],
                "grid_rows": f["grid_rows"], "grid_cols": f["grid_cols"],
                "gps_coords": gps,
                "created_at": f["created_at"].isoformat() if f["created_at"] else None
            })
        
        trees_data = [format_tree(t) for t in trees]
        
        int_data = [{
            "id": i["id"], "tree_id": i["tree_id"], "type": i["type"],
            "notes": i["notes"], "date": i["date"].isoformat() if i["date"] else None
        } for i in interventions]
        
        return {
            "export_date": datetime.utcnow().isoformat(),
            "farms": farms_data,
            "trees": trees_data,
            "interventions": int_data
        }

@app.post("/api/import")
def import_data(data: dict):
    with get_db() as conn:
        cursor = conn.cursor()
        imported = {"farms": 0, "trees": 0, "interventions": 0}
        
        for farm in data.get("farms", []):
            farm_id = farm.get("id") or generate_id()
            gps = farm.get("gps_coords")
            cursor.execute("""
                INSERT IGNORE INTO farms (id, name, description, grid_rows, grid_cols, gps_latitude, gps_longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (farm_id, farm["name"], farm.get("description"), farm.get("grid_rows", 20), farm.get("grid_cols", 20),
                  gps["latitude"] if gps else None, gps["longitude"] if gps else None))
            imported["farms"] += 1
        
        for tree in data.get("trees", []):
            tree_id = tree.get("id") or generate_id()
            gps = tree.get("gps_coords")
            cursor.execute("""
                INSERT IGNORE INTO trees (id, farm_id, position, species, variety, plant_date, health, notes, origin, gps_latitude, gps_longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (tree_id, tree["farm_id"], tree["position"], tree["species"], tree.get("variety"),
                  tree.get("plant_date"), tree.get("health", "good"), tree.get("notes"), tree.get("origin"),
                  gps["latitude"] if gps else None, gps["longitude"] if gps else None))
            imported["trees"] += 1
        
        for intervention in data.get("interventions", []):
            int_id = intervention.get("id") or generate_id()
            cursor.execute("""
                INSERT IGNORE INTO interventions (id, tree_id, type, notes, date)
                VALUES (%s, %s, %s, %s, %s)
            """, (int_id, intervention["tree_id"], intervention["type"], intervention.get("notes"), intervention.get("date")))
            imported["interventions"] += 1
        
        return {"message": "Import réussi", "imported": imported, "success": True}

# ============== SYNC ENDPOINT ==============

@app.post("/api/trees/sync")
def sync_trees(sync_batch: SyncBatch):
    synced = []
    errors = []
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        for tree_data in sync_batch.trees:
            try:
                if tree_data.get("id"):
                    cursor.execute("SELECT id FROM trees WHERE id = %s", (tree_data["id"],))
                    if cursor.fetchone():
                        # Update
                        cursor.execute("""
                            UPDATE trees SET species=%s, variety=%s, health=%s, notes=%s, synced=TRUE, updated_at=%s WHERE id=%s
                        """, (tree_data.get("species"), tree_data.get("variety"), tree_data.get("health"),
                              tree_data.get("notes"), datetime.utcnow(), tree_data["id"]))
                        synced.append(tree_data)
                        continue
                
                # Create new
                tree_id = generate_id()
                cursor.execute("""
                    INSERT INTO trees (id, farm_id, position, species, variety, plant_date, health, notes, synced)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                """, (tree_id, tree_data["farm_id"], tree_data["position"], tree_data["species"],
                      tree_data.get("variety"), tree_data.get("plant_date"), tree_data.get("health", "good"),
                      tree_data.get("notes")))
                tree_data["id"] = tree_id
                synced.append(tree_data)
            except Exception as e:
                errors.append({"data": tree_data, "error": str(e)})
    
    return {"synced_count": len(synced), "error_count": len(errors), "synced_trees": synced, "errors": errors}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
