from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import os
import hashlib
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

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)
db = client.arboria_db
farms_collection = db.farms
trees_collection = db.trees
users_collection = db.users
interventions_collection = db.interventions

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
    position: str  # e.g., "A1", "B5"
    species: str
    variety: Optional[str] = None
    plant_date: str
    health: str  # "good", "fair", "poor", "dead"
    notes: Optional[str] = None
    photo: Optional[str] = None  # base64 encoded
    photos: Optional[List[str]] = None  # multiple photos support
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
    photos: Optional[List[str]] = None
    gps_coords: Optional[GPSCoords] = None
    synced: Optional[bool] = None
    origin: Optional[str] = None

class SyncBatch(BaseModel):
    trees: List[dict]

# Intervention Models
class Intervention(BaseModel):
    tree_id: str
    type: str  # "watering", "treatment", "pruning", "harvest", "fertilization", "observation"
    notes: Optional[str] = None
    date: Optional[str] = None

class InterventionUpdate(BaseModel):
    type: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[str] = None

# User/Auth Models
class UserRegister(BaseModel):
    phone: str
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

# Export/Import Models
class ExportData(BaseModel):
    farms: List[dict]
    trees: List[dict]
    interventions: List[dict]

# Duplicate Tree Model
class DuplicateTree(BaseModel):
    source_tree_id: str
    target_position: str
    target_farm_id: Optional[str] = None

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "ArborIA API - Gestion Arboricole", "version": "2.0.0"}

# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/register")
def register_user(user: UserRegister):
    # Check if user already exists
    existing = users_collection.find_one({"phone": user.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")
    
    user_dict = {
        "phone": user.phone,
        "password_hash": hash_password(user.password),
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = users_collection.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "phone": user.phone,
        "message": "Inscription réussie"
    }

@app.post("/api/auth/login")
def login_user(user: UserLogin):
    db_user = users_collection.find_one({"phone": user.phone})
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Numéro de téléphone ou mot de passe incorrect")
    
    if db_user["password_hash"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Numéro de téléphone ou mot de passe incorrect")
    
    return {
        "id": str(db_user["_id"]),
        "phone": db_user["phone"],
        "message": "Connexion réussie"
    }

@app.get("/api/auth/demo")
def demo_login():
    """Demo login - allows testing without real account"""
    # Check if demo user exists, create if not
    demo_user = users_collection.find_one({"phone": "demo"})
    
    if not demo_user:
        user_dict = {
            "phone": "demo",
            "password_hash": hash_password("demo123"),
            "created_at": datetime.utcnow().isoformat(),
            "is_demo": True
        }
        result = users_collection.insert_one(user_dict)
        return {
            "id": str(result.inserted_id),
            "phone": "demo",
            "is_demo": True,
            "message": "Connexion démo réussie"
        }
    
    return {
        "id": str(demo_user["_id"]),
        "phone": "demo",
        "is_demo": True,
        "message": "Connexion démo réussie"
    }

# ============== FARM ENDPOINTS ==============

@app.post("/api/farms")
def create_farm(farm: Farm):
    farm_dict = farm.dict()
    farm_dict["created_at"] = datetime.utcnow().isoformat()
    farm_dict["updated_at"] = datetime.utcnow().isoformat()

    result = farms_collection.insert_one(farm_dict)
    farm_dict["id"] = str(result.inserted_id)
    del farm_dict["_id"]

    return farm_dict

@app.get("/api/farms")
def get_farms():
    farms = list(farms_collection.find())
    return [serialize_doc(farm) for farm in farms]

@app.get("/api/farms/{farm_id}")
def get_farm(farm_id: str):
    try:
        farm = farms_collection.find_one({"_id": ObjectId(farm_id)})
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        return serialize_doc(farm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/farms/{farm_id}")
def update_farm(farm_id: str, farm_update: FarmUpdate):
    try:
        update_data = {k: v for k, v in farm_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()

        result = farms_collection.update_one(
            {"_id": ObjectId(farm_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Farm not found")

        farm = farms_collection.find_one({"_id": ObjectId(farm_id)})
        return serialize_doc(farm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/farms/{farm_id}")
def delete_farm(farm_id: str):
    try:
        # Delete all interventions for trees in this farm
        trees = list(trees_collection.find({"farm_id": farm_id}))
        tree_ids = [str(tree["_id"]) for tree in trees]
        interventions_collection.delete_many({"tree_id": {"$in": tree_ids}})
        
        # Delete all trees associated with this farm
        trees_collection.delete_many({"farm_id": farm_id})

        # Delete the farm
        result = farms_collection.delete_one({"_id": ObjectId(farm_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Farm not found")

        return {"message": "Farm and associated trees deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== TREE ENDPOINTS ==============

@app.post("/api/trees")
def create_tree(tree: Tree):
    # Check if position already has a tree
    existing = trees_collection.find_one({
        "farm_id": tree.farm_id,
        "position": tree.position
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A tree already exists at position {tree.position}"
        )

    tree_dict = tree.dict()
    tree_dict["created_at"] = datetime.utcnow().isoformat()
    tree_dict["updated_at"] = datetime.utcnow().isoformat()
    
    # Initialize photos array if not provided
    if not tree_dict.get("photos"):
        tree_dict["photos"] = []
        if tree_dict.get("photo"):
            tree_dict["photos"].append(tree_dict["photo"])

    result = trees_collection.insert_one(tree_dict)
    tree_dict["id"] = str(result.inserted_id)
    del tree_dict["_id"]

    return tree_dict

@app.get("/api/trees")
def get_trees(farm_id: Optional[str] = None):
    query = {}
    if farm_id:
        query["farm_id"] = farm_id

    trees = list(trees_collection.find(query))
    return [serialize_doc(tree) for tree in trees]

@app.get("/api/trees/{tree_id}")
def get_tree(tree_id: str):
    try:
        tree = trees_collection.find_one({"_id": ObjectId(tree_id)})
        if not tree:
            raise HTTPException(status_code=404, detail="Tree not found")
        return serialize_doc(tree)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/trees/{tree_id}")
def update_tree(tree_id: str, tree_update: TreeUpdate):
    try:
        update_data = {k: v for k, v in tree_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow().isoformat()

        result = trees_collection.update_one(
            {"_id": ObjectId(tree_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Tree not found")

        tree = trees_collection.find_one({"_id": ObjectId(tree_id)})
        return serialize_doc(tree)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/trees/{tree_id}")
def delete_tree(tree_id: str):
    try:
        # Delete all interventions for this tree
        interventions_collection.delete_many({"tree_id": tree_id})
        
        result = trees_collection.delete_one({"_id": ObjectId(tree_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Tree not found")

        return {"message": "Tree deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== DUPLICATE TREE ENDPOINT ==============

@app.post("/api/trees/duplicate")
def duplicate_tree(data: DuplicateTree):
    try:
        # Get source tree
        source_tree = trees_collection.find_one({"_id": ObjectId(data.source_tree_id)})
        if not source_tree:
            raise HTTPException(status_code=404, detail="Source tree not found")
        
        target_farm_id = data.target_farm_id or source_tree["farm_id"]
        
        # Check if position is available
        existing = trees_collection.find_one({
            "farm_id": target_farm_id,
            "position": data.target_position
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Position {data.target_position} is already occupied"
            )
        
        # Create new tree with source data
        new_tree = {
            "farm_id": target_farm_id,
            "position": data.target_position,
            "species": source_tree["species"],
            "variety": source_tree.get("variety"),
            "plant_date": datetime.utcnow().isoformat().split('T')[0],
            "health": "good",
            "notes": f"Dupliqué de {source_tree['position']}",
            "origin": source_tree.get("origin"),
            "photos": [],
            "synced": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = trees_collection.insert_one(new_tree)
        new_tree["id"] = str(result.inserted_id)
        del new_tree["_id"]
        
        return new_tree
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== SEARCH ENDPOINT ==============

@app.get("/api/search")
def search_trees(
    farm_id: Optional[str] = None,
    query: Optional[str] = None,
    health: Optional[str] = None,
    species: Optional[str] = None
):
    filter_query = {}
    
    if farm_id:
        filter_query["farm_id"] = farm_id
    
    if health and health != "all":
        filter_query["health"] = health
    
    if species:
        filter_query["species"] = {"$regex": species, "$options": "i"}
    
    trees = list(trees_collection.find(filter_query))
    results = [serialize_doc(tree) for tree in trees]
    
    # Text search if query provided
    if query:
        query_lower = query.lower()
        results = [
            tree for tree in results
            if query_lower in tree.get("species", "").lower()
            or query_lower in tree.get("variety", "").lower()
            or query_lower in tree.get("position", "").lower()
            or query_lower in tree.get("notes", "").lower()
        ]
    
    return results

# ============== INTERVENTION ENDPOINTS ==============

@app.post("/api/interventions")
def create_intervention(intervention: Intervention):
    # Verify tree exists
    tree = trees_collection.find_one({"_id": ObjectId(intervention.tree_id)})
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    intervention_dict = intervention.dict()
    intervention_dict["date"] = intervention_dict.get("date") or datetime.utcnow().isoformat()
    intervention_dict["created_at"] = datetime.utcnow().isoformat()
    
    result = interventions_collection.insert_one(intervention_dict)
    intervention_dict["id"] = str(result.inserted_id)
    del intervention_dict["_id"]
    
    return intervention_dict

@app.get("/api/interventions")
def get_interventions(tree_id: Optional[str] = None):
    query = {}
    if tree_id:
        query["tree_id"] = tree_id
    
    interventions = list(interventions_collection.find(query).sort("date", -1))
    return [serialize_doc(i) for i in interventions]

@app.get("/api/interventions/{intervention_id}")
def get_intervention(intervention_id: str):
    try:
        intervention = interventions_collection.find_one({"_id": ObjectId(intervention_id)})
        if not intervention:
            raise HTTPException(status_code=404, detail="Intervention not found")
        return serialize_doc(intervention)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/interventions/{intervention_id}")
def delete_intervention(intervention_id: str):
    try:
        result = interventions_collection.delete_one({"_id": ObjectId(intervention_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Intervention not found")
        return {"message": "Intervention deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== PHOTO MANAGEMENT ==============

@app.post("/api/trees/{tree_id}/photos")
def add_photo(tree_id: str, photo_data: dict):
    try:
        tree = trees_collection.find_one({"_id": ObjectId(tree_id)})
        if not tree:
            raise HTTPException(status_code=404, detail="Tree not found")
        
        photos = tree.get("photos", [])
        if photo_data.get("photo"):
            photos.append(photo_data["photo"])
        
        trees_collection.update_one(
            {"_id": ObjectId(tree_id)},
            {
                "$set": {
                    "photos": photos,
                    "photo": photo_data.get("photo"),  # Keep last photo as main
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return {"message": "Photo added successfully", "photo_count": len(photos)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/trees/{tree_id}/photos/{photo_index}")
def delete_photo(tree_id: str, photo_index: int):
    try:
        tree = trees_collection.find_one({"_id": ObjectId(tree_id)})
        if not tree:
            raise HTTPException(status_code=404, detail="Tree not found")
        
        photos = tree.get("photos", [])
        if photo_index < 0 or photo_index >= len(photos):
            raise HTTPException(status_code=400, detail="Invalid photo index")
        
        photos.pop(photo_index)
        
        # Update main photo if needed
        main_photo = photos[-1] if photos else None
        
        trees_collection.update_one(
            {"_id": ObjectId(tree_id)},
            {
                "$set": {
                    "photos": photos,
                    "photo": main_photo,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return {"message": "Photo deleted successfully", "photo_count": len(photos)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============== EXPORT/IMPORT ENDPOINTS ==============

@app.get("/api/export")
def export_data(farm_id: Optional[str] = None):
    """Export all data or data for a specific farm"""
    try:
        if farm_id:
            farms = list(farms_collection.find({"_id": ObjectId(farm_id)}))
            trees = list(trees_collection.find({"farm_id": farm_id}))
            tree_ids = [str(tree["_id"]) for tree in trees]
            interventions = list(interventions_collection.find({"tree_id": {"$in": tree_ids}}))
        else:
            farms = list(farms_collection.find())
            trees = list(trees_collection.find())
            interventions = list(interventions_collection.find())
        
        return {
            "export_date": datetime.utcnow().isoformat(),
            "farms": [serialize_doc(f) for f in farms],
            "trees": [serialize_doc(t) for t in trees],
            "interventions": [serialize_doc(i) for i in interventions]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/import")
def import_data(data: dict):
    """Import data from export"""
    try:
        imported = {"farms": 0, "trees": 0, "interventions": 0}
        
        # Import farms
        for farm_data in data.get("farms", []):
            if "id" in farm_data:
                del farm_data["id"]
            farm_data["created_at"] = farm_data.get("created_at", datetime.utcnow().isoformat())
            farm_data["updated_at"] = datetime.utcnow().isoformat()
            farms_collection.insert_one(farm_data)
            imported["farms"] += 1
        
        # Import trees
        for tree_data in data.get("trees", []):
            if "id" in tree_data:
                del tree_data["id"]
            tree_data["created_at"] = tree_data.get("created_at", datetime.utcnow().isoformat())
            tree_data["updated_at"] = datetime.utcnow().isoformat()
            trees_collection.insert_one(tree_data)
            imported["trees"] += 1
        
        # Import interventions
        for int_data in data.get("interventions", []):
            if "id" in int_data:
                del int_data["id"]
            int_data["created_at"] = int_data.get("created_at", datetime.utcnow().isoformat())
            interventions_collection.insert_one(int_data)
            imported["interventions"] += 1
        
        return {
            "message": "Import successful",
            "imported": imported
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Batch sync endpoint for offline mode
@app.post("/api/trees/sync")
def sync_trees(sync_batch: SyncBatch):
    synced_trees = []
    errors = []

    for tree_data in sync_batch.trees:
        try:
            # If tree has an id, update it; otherwise create new
            if "id" in tree_data and tree_data["id"]:
                tree_id = tree_data["id"]
                del tree_data["id"]
                tree_data["updated_at"] = datetime.utcnow().isoformat()
                tree_data["synced"] = True

                result = trees_collection.update_one(
                    {"_id": ObjectId(tree_id)},
                    {"$set": tree_data}
                )

                if result.matched_count > 0:
                    tree = trees_collection.find_one({"_id": ObjectId(tree_id)})
                    synced_trees.append(serialize_doc(tree))
                else:
                    errors.append({"tree_id": tree_id, "error": "Tree not found"})
            else:
                # Create new tree
                tree_data["created_at"] = datetime.utcnow().isoformat()
                tree_data["updated_at"] = datetime.utcnow().isoformat()
                tree_data["synced"] = True

                result = trees_collection.insert_one(tree_data)
                tree_data["id"] = str(result.inserted_id)
                del tree_data["_id"]
                synced_trees.append(tree_data)
        except Exception as e:
            errors.append({"tree_data": tree_data, "error": str(e)})

    return {
        "synced_count": len(synced_trees),
        "error_count": len(errors),
        "synced_trees": synced_trees,
        "errors": errors
    }

# Statistics endpoint
@app.get("/api/statistics/{farm_id}")
def get_statistics(farm_id: str):
    trees = list(trees_collection.find({"farm_id": farm_id}))
    tree_ids = [str(tree["_id"]) for tree in trees]
    interventions = list(interventions_collection.find({"tree_id": {"$in": tree_ids}}))

    stats = {
        "total": len(trees),
        "good": 0,
        "fair": 0,
        "poor": 0,
        "dead": 0,
        "species_count": {},
        "recent_plantings": 0,
        "total_interventions": len(interventions),
        "interventions_by_type": {}
    }

    # Count by health status
    for tree in trees:
        health = tree.get("health", "good")
        stats[health] = stats.get(health, 0) + 1

        # Count by species
        species = tree.get("species", "Unknown")
        stats["species_count"][species] = stats["species_count"].get(species, 0) + 1

        # Count recent plantings (last 30 days)
        plant_date = tree.get("plant_date")
        if plant_date:
            try:
                plant_datetime = datetime.fromisoformat(plant_date.replace('Z', '+00:00').replace('+00:00', ''))
                days_diff = (datetime.now() - plant_datetime).days
                if days_diff <= 30:
                    stats["recent_plantings"] += 1
            except:
                pass
    
    # Count interventions by type
    for intervention in interventions:
        int_type = intervention.get("type", "other")
        stats["interventions_by_type"][int_type] = stats["interventions_by_type"].get(int_type, 0) + 1

    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
