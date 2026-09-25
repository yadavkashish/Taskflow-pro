from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.dependency import Dependency

def seed_data(db: Session):
    # Create tasks
    tasks = [
        Task(
            title="Requirements Gathering",
            description="Gather all requirements for the project.",
            status="done",
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=5),
            duration=5,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Database Schema",
            description="Design the database schema.",
            status="done",
            start_date=datetime.now() + timedelta(days=1),
            end_date=datetime.now() + timedelta(days=6),
            duration=5,
            board_column="backlog",
            position=2,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Backend API",
            description="Implement the backend API.",
            status="in_progress",
            start_date=datetime.now() + timedelta(days=2),
            end_date=datetime.now() + timedelta(days=10),
            duration=8,
            board_column="in_progress",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Frontend Components",
            description="Develop frontend components.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=3),
            end_date=datetime.now() + timedelta(days=12),
            duration=9,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="API Integration",
            description="Integrate frontend with backend API.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=4),
            end_date=datetime.now() + timedelta(days=14),
            duration=10,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Testing",
            description="Perform testing on the application.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=5),
            end_date=datetime.now() + timedelta(days=15),
            duration=10,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Deployment",
            description="Deploy the application to production.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=6),
            end_date=datetime.now() + timedelta(days=16),
            duration=10,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Documentation",
            description="Create documentation for the project.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=7),
            end_date=datetime.now() + timedelta(days=17),
            duration=10,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
        Task(
            title="Feedback and Iteration",
            description="Gather feedback and iterate on the project.",
            status="backlog",
            start_date=datetime.now() + timedelta(days=8),
            end_date=datetime.now() + timedelta(days=18),
            duration=10,
            board_column="backlog",
            position=1,
            created_at=datetime.now(),
            updated_at=datetime.now()
        ),
    ]

    # Add tasks to the session
    db.add_all(tasks)
    db.commit()

    # Create dependencies
    dependencies = [
        Dependency(predecessor_id=1, successor_id=2),  # Requirements Gathering -> Database Schema
        Dependency(predecessor_id=2, successor_id=3),  # Database Schema -> Backend API
        Dependency(predecessor_id=3, successor_id=4),  # Backend API -> Frontend Components
        Dependency(predecessor_id=3, successor_id=5),  # Backend API -> API Integration
        Dependency(predecessor_id=4, successor_id=5),  # Frontend Components -> API Integration
        Dependency(predecessor_id=5, successor_id=6),  # API Integration -> Testing
        Dependency(predecessor_id=6, successor_id=7),  # Testing -> Deployment
        Dependency(predecessor_id=7, successor_id=8),  # Deployment -> Documentation
        Dependency(predecessor_id=8, successor_id=9),  # Documentation -> Feedback and Iteration
    ]

    # Add dependencies to the session
    db.add_all(dependencies)
    db.commit()