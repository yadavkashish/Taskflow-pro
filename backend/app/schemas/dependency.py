from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class DependencyBase(BaseModel):
    predecessor_id: int
    successor_id: int

class DependencyCreate(DependencyBase):
    pass

class Dependency(DependencyBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DependencyOut(DependencyBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DependencyList(BaseModel):
    dependencies: List[DependencyOut]
