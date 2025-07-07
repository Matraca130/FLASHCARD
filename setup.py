from setuptools import setup, find_packages

setup(
    name="flashcard-app",
    version="1.0.0",
    description="StudyingFlash - Aplicación de Flashcards Inteligente",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "flask>=2.0.0",
        "flask-cors>=4.0.0",
        "flask-jwt-extended>=4.0.0",
        "flask-sqlalchemy>=3.0.0",
        "flask-migrate>=4.0.0",
        "flask-limiter>=3.0.0",
        "python-dotenv>=1.0.0",
        "pyyaml>=6.0",
        "sentry-sdk>=1.0.0",
        "structlog>=23.0.0",
    ],
    extras_require={
        "test": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "pytest-flask>=1.2.0",
        ],
        "dev": [
            "flake8>=6.0.0",
            "black>=23.0.0",
            "ruff>=0.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "flashcard-app=backend_app:create_app",
        ],
    },
)

