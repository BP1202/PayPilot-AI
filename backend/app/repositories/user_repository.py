import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def generate_id(self) -> str:
        return f"usr_{uuid.uuid4().hex}"

    def create(self, user: User) -> User:
        if not user.id:
            user.id = self.generate_id()
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.strip().lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_or_create_seed_user(
        self,
        user_id: str = "owner_default",
        email: str = "owner@apexgearworks.demo",
        password: str = "Password123!",
        full_name: str = "Apex Gearworks Owner",
    ) -> User:
        user = self.get_by_id(user_id)
        if user:
            return user

        user_by_email = self.get_by_email(email)
        if user_by_email:
            return user_by_email

        seed_user = User(
            id=user_id,
            email=email.strip().lower(),
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
        )
        self.db.add(seed_user)
        self.db.commit()
        self.db.refresh(seed_user)
        return seed_user
