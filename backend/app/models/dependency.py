from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Dependency(Base):
    __tablename__ = 'dependencies'
    __table_args__ = (
        UniqueConstraint('predecessor_id', 'successor_id', name='uq_dependency_edge'),
    )

    id = Column(Integer, primary_key=True, index=True)
    predecessor_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    successor_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    predecessor = relationship("Task", foreign_keys=[predecessor_id])
    successor = relationship("Task", foreign_keys=[successor_id])
