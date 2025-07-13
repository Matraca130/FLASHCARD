"""
Configuración global de pytest con fixtures para testing
"""
import pytest
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import Mock

from backend_app import create_app
from backend_app.models.models import db, User, Deck, Flashcard
from backend_app.services_new import create_services


@pytest.fixture(scope='session')
def app():
    """Crear aplicación Flask para testing"""
    # Crear base de datos temporal
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'JWT_ACCESS_TOKEN_EXPIRES': timedelta(hours=1),
        'WTF_CSRF_ENABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Cliente de testing Flask"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Runner de comandos CLI"""
    return app.test_cli_runner()


@pytest.fixture
def db_session(app):
    """Sesión de base de datos para testing"""
    with app.app_context():
        # Limpiar todas las tablas antes de cada test
        db.session.query(Flashcard).delete()
        db.session.query(Deck).delete()
        db.session.query(User).delete()
        db.session.commit()
        yield db.session
        db.session.rollback()


@pytest.fixture
def test_user(db_session):
    """Usuario de prueba"""
    user = User(
        username='testuser',
        email='test@example.com',
        first_name='Test',
        last_name='User',
        password_hash='hashed_password'
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_deck(db_session, test_user):
    """Deck de prueba"""
    deck = Deck(
        user_id=test_user.id,
        name='Test Deck',
        description='Deck para testing',
        difficulty_level='intermediate',
        is_public=False
    )
    db_session.add(deck)
    db_session.commit()
    return deck


@pytest.fixture
def test_flashcard(db_session, test_deck):
    """Flashcard de prueba"""
    flashcard = Flashcard(
        deck_id=test_deck.id,
        front_text='Test Question',
        back_text='Test Answer',
        difficulty='normal',
        interval_days=1,
        ease_factor=2.5,
        repetitions=0
    )
    db_session.add(flashcard)
    db_session.commit()
    return flashcard


@pytest.fixture
def auth_headers(client, test_user):
    """Headers de autenticación con JWT"""
    from flask_jwt_extended import create_access_token
    
    with client.application.app_context():
        token = create_access_token(identity=test_user.id)
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def services(app):
    """Servicios configurados para testing"""
    with app.app_context():
        mock_cache = Mock()
        return create_services(db=db, cache=mock_cache)


@pytest.fixture
def deck_service(services):
    """Servicio de decks para testing"""
    return services['deck_service']


@pytest.fixture
def flashcard_service(services):
    """Servicio de flashcards para testing"""
    return services['flashcard_service']


@pytest.fixture
def study_service(services):
    """Servicio de estudio para testing"""
    return services['study_service']


@pytest.fixture
def stats_service(services):
    """Servicio de estadísticas para testing"""
    return services['stats_service']


# Fixtures para datos de testing
@pytest.fixture
def valid_deck_data():
    """Datos válidos para crear un deck"""
    return {
        'name': 'Vocabulario Inglés',
        'description': 'Palabras básicas en inglés',
        'difficulty_level': 'intermediate',
        'is_public': False
    }


@pytest.fixture
def valid_flashcard_data(test_deck):
    """Datos válidos para crear una flashcard"""
    return {
        'deck_id': test_deck.id,
        'front_text': '¿Cómo se dice "hello" en español?',
        'back_text': 'Hola',
        'difficulty': 1
    }


@pytest.fixture
def multiple_flashcards(db_session, test_deck):
    """Múltiples flashcards para testing de algoritmos"""
    flashcards = []
    for i in range(5):
        flashcard = Flashcard(
            deck_id=test_deck.id,
            front_text=f'Question {i+1}',
            back_text=f'Answer {i+1}',
            difficulty='normal',
            interval_days=1,
            ease_factor=2.5,
            repetitions=0
        )
        db_session.add(flashcard)
        flashcards.append(flashcard)
    
    db_session.commit()
    return flashcards

