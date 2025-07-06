"""
Esquemas de validación centralizados usando Pydantic
Proporciona validación robusta y mensajes de error claros
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
import re


class UserRegistrationSchema(BaseModel):
    """Esquema de validación para registro de usuario"""

    username: str = Field(..., min_length=3, max_length=25, description="Nombre de usuario único")
    email: EmailStr = Field(..., description="Dirección de email válida")
    password: str = Field(..., min_length=8, max_length=128, description="Contraseña segura")
    first_name: str = Field(..., min_length=1, max_length=50, description="Nombre")
    last_name: str = Field(..., min_length=1, max_length=50, description="Apellido")

    @validator("username")
    def validate_username(cls, v):
        """Validar formato de username"""
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos")
        return v.lower()

    @validator("password")
    def validate_password(cls, v):
        """Validar fortaleza de contraseña"""
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v

    @validator("first_name", "last_name")
    def validate_names(cls, v):
        """Validar nombres"""
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v):
            raise ValueError("Los nombres solo pueden contener letras y espacios")
        return v.strip().title()


class UserLoginSchema(BaseModel):
    """Esquema de validación para login de usuario"""

    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., min_length=1, description="Contraseña del usuario")


class DeckCreationSchema(BaseModel):
    """Esquema de validación para creación de deck"""

    name: str = Field(..., min_length=1, max_length=100, description="Nombre del deck")
    description: Optional[str] = Field(None, max_length=500, description="Descripción del deck")
    difficulty_level: str = Field(default="intermediate", description="Nivel de dificultad")
    is_public: bool = Field(default=False, description="Si el deck es público")
    tags: Optional[List[str]] = Field(default=[], description="Etiquetas del deck")

    @validator("difficulty_level")
    def validate_difficulty(cls, v):
        """Validar nivel de dificultad"""
        valid_levels = ["beginner", "intermediate", "advanced"]
        if v not in valid_levels:
            raise ValueError(f'Nivel de dificultad debe ser uno de: {", ".join(valid_levels)}')
        return v

    @validator("tags")
    def validate_tags(cls, v):
        """Validar etiquetas"""
        if v and len(v) > 10:
            raise ValueError("Máximo 10 etiquetas permitidas")
        if v:
            for tag in v:
                if len(tag) > 20:
                    raise ValueError("Cada etiqueta debe tener máximo 20 caracteres")
        return v


class FlashcardCreationSchema(BaseModel):
    """Esquema de validación para creación de flashcard"""

    deck_id: int = Field(..., gt=0, description="ID del deck al que pertenece")
    front_text: str = Field(..., min_length=1, max_length=1000, description="Texto del frente de la carta")
    back_text: str = Field(..., min_length=1, max_length=1000, description="Texto del reverso de la carta")
    front_image: Optional[str] = Field(None, max_length=500, description="URL de imagen del frente")
    back_image: Optional[str] = Field(None, max_length=500, description="URL de imagen del reverso")
    front_audio: Optional[str] = Field(None, max_length=500, description="URL de audio del frente")
    back_audio: Optional[str] = Field(None, max_length=500, description="URL de audio del reverso")
    difficulty: str = Field(default="normal", description="Dificultad de la carta")
    tags: Optional[List[str]] = Field(default=[], description="Etiquetas de la carta")

    @validator("difficulty")
    def validate_difficulty(cls, v):
        """Validar dificultad"""
        valid_difficulties = ["easy", "normal", "hard"]
        if v not in valid_difficulties:
            raise ValueError(f'Dificultad debe ser una de: {", ".join(valid_difficulties)}')
        return v

    @validator("tags")
    def validate_tags(cls, v):
        """Validar etiquetas"""
        if v and len(v) > 5:
            raise ValueError("Máximo 5 etiquetas permitidas por carta")
        return v


class StudyAnswerSchema(BaseModel):
    """Esquema de validación para respuesta de estudio"""

    card_id: int = Field(..., gt=0, description="ID de la carta")
    quality: int = Field(..., ge=1, le=4, description="Calidad de la respuesta (1-4)")
    session_id: int = Field(..., gt=0, description="ID de la sesión de estudio")
    response_time: Optional[int] = Field(None, ge=0, description="Tiempo de respuesta en milisegundos")

    @validator("quality")
    def validate_quality(cls, v):
        """Validar calidad de respuesta"""
        quality_map = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy"}
        if v not in quality_map:
            raise ValueError(f"Calidad debe ser 1-4: {quality_map}")
        return v


class StudySessionSchema(BaseModel):
    """Esquema de validación para sesión de estudio"""

    deck_id: int = Field(..., gt=0, description="ID del deck a estudiar")
    algorithm: str = Field(default="fsrs", description="Algoritmo de repetición espaciada")
    max_cards: Optional[int] = Field(default=20, ge=1, le=100, description="Máximo número de cartas en la sesión")

    @validator("algorithm")
    def validate_algorithm(cls, v):
        """Validar algoritmo"""
        valid_algorithms = ["fsrs", "sm2"]
        if v not in valid_algorithms:
            raise ValueError(f'Algoritmo debe ser uno de: {", ".join(valid_algorithms)}')
        return v


class UpdateProfileSchema(BaseModel):
    """Esquema de validación para actualización de perfil"""

    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, max_length=20)
    daily_goal: Optional[int] = Field(None, ge=1, le=200)

    @validator("first_name", "last_name")
    def validate_names(cls, v):
        """Validar nombres"""
        if v and not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v):
            raise ValueError("Los nombres solo pueden contener letras y espacios")
        return v.strip().title() if v else v

    @validator("theme")
    def validate_theme(cls, v):
        """Validar tema"""
        if v:
            valid_themes = ["light", "dark", "auto"]
            if v not in valid_themes:
                raise ValueError(f'Tema debe ser uno de: {", ".join(valid_themes)}')
        return v

    @validator("language")
    def validate_language(cls, v):
        """Validar idioma"""
        if v:
            valid_languages = ["es", "en", "fr", "de", "it", "pt"]
            if v not in valid_languages:
                raise ValueError(f'Idioma debe ser uno de: {", ".join(valid_languages)}')
        return v
