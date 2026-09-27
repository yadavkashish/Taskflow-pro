from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProjectName(BaseModel):
    name: str = Field(max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Project name cannot be empty")
        return name


class ProjectCreate(ProjectName):
    description: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    target_deadline: date | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.target_deadline and self.target_deadline < self.start_date:
            raise ValueError("target_deadline must be on or after start_date")
        return self


class ProjectUpdate(ProjectCreate):
    description: str | None = Field(default=None, max_length=500)


class Project(ProjectName):
    id: int
    description: str | None
    start_date: date | None
    target_deadline: date | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
