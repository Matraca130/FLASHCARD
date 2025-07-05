"""
Tests unitarios para DeckService
"""
import pytest
from unittest.mock import Mock, patch
from sqlalchemy.exc import IntegrityError

from backend_app.models.models import Deck


class TestDeckService:
    """Tests para DeckService"""
    
    @pytest.mark.unit
    def test_create_deck_success(self, deck_service, test_user, valid_deck_data):
        """Test crear deck exitosamente"""
        result = deck_service.create_deck(test_user.id, valid_deck_data)
        
        assert result['success'] is True
        assert 'data' in result
        assert result['data']['name'] == valid_deck_data['name']
        assert result['data']['user_id'] == test_user.id
        assert result['data']['is_public'] is False
    
    @pytest.mark.unit
    def test_create_deck_invalid_name_empty(self, deck_service, test_user):
        """Test crear deck con nombre vacío"""
        invalid_data = {
            'name': '',
            'description': 'Test description',
            'is_public': False
        }
        
        result = deck_service.create_deck(test_user.id, invalid_data)
        
        assert result['success'] is False
        assert 'error' in result
        assert 'nombre' in result['error'].lower()
    
    @pytest.mark.unit
    def test_create_deck_invalid_name_too_long(self, deck_service, test_user):
        """Test crear deck con nombre muy largo"""
        invalid_data = {
            'name': 'x' * 101,  # Más de 100 caracteres
            'description': 'Test description',
            'is_public': False
        }
        
        result = deck_service.create_deck(test_user.id, invalid_data)
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.unit
    def test_get_user_decks(self, deck_service, test_user, test_deck):
        """Test obtener decks del usuario"""
        result = deck_service.get_user_decks(test_user.id)
        
        assert result['success'] is True
        assert len(result['data']) == 1
        assert result['data'][0]['id'] == test_deck.id
        assert result['data'][0]['name'] == test_deck.name
    
    @pytest.mark.unit
    def test_get_user_decks_empty(self, deck_service, test_user):
        """Test obtener decks cuando el usuario no tiene ninguno"""
        result = deck_service.get_user_decks(test_user.id)
        
        assert result['success'] is True
        assert len(result['data']) == 0
    
    @pytest.mark.unit
    def test_get_deck_by_id_success(self, deck_service, test_user, test_deck):
        """Test obtener deck por ID exitosamente"""
        result = deck_service.get_deck_by_id(test_deck.id, test_user.id)
        
        assert result['success'] is True
        assert result['data']['id'] == test_deck.id
        assert result['data']['name'] == test_deck.name
    
    @pytest.mark.unit
    def test_get_deck_by_id_not_found(self, deck_service, test_user):
        """Test obtener deck que no existe"""
        result = deck_service.get_deck_by_id(99999, test_user.id)
        
        assert result['success'] is False
        assert 'error' in result
        assert 'no encontrado' in result['error'].lower()
    
    @pytest.mark.unit
    def test_get_deck_by_id_wrong_owner(self, deck_service, test_deck, db_session):
        """Test obtener deck de otro usuario"""
        # Crear otro usuario
        from backend_app.models.models import User
        other_user = User(
            username='otheruser',
            email='other@example.com',
            password_hash='hashed'
        )
        db_session.add(other_user)
        db_session.commit()
        
        result = deck_service.get_deck_by_id(test_deck.id, other_user.id)
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.unit
    def test_update_deck_success(self, deck_service, test_user, test_deck):
        """Test actualizar deck exitosamente"""
        update_data = {
            'name': 'Updated Deck Name',
            'description': 'Updated description'
        }
        
        result = deck_service.update_deck(test_deck.id, test_user.id, update_data)
        
        assert result['success'] is True
        assert result['data']['name'] == update_data['name']
        assert result['data']['description'] == update_data['description']
    
    @pytest.mark.unit
    def test_update_deck_partial(self, deck_service, test_user, test_deck):
        """Test actualizar deck parcialmente"""
        original_description = test_deck.description
        update_data = {'name': 'New Name Only'}
        
        result = deck_service.update_deck(test_deck.id, test_user.id, update_data)
        
        assert result['success'] is True
        assert result['data']['name'] == update_data['name']
        assert result['data']['description'] == original_description
    
    @pytest.mark.unit
    def test_delete_deck_success(self, deck_service, test_user, test_deck):
        """Test eliminar deck exitosamente (soft delete)"""
        result = deck_service.delete_deck(test_deck.id, test_user.id)
        
        assert result['success'] is True
        
        # Verificar que el deck está marcado como eliminado
        deleted_deck = deck_service.get_deck_by_id(test_deck.id, test_user.id)
        assert deleted_deck['success'] is False
    
    @pytest.mark.unit
    def test_delete_deck_not_found(self, deck_service, test_user):
        """Test eliminar deck que no existe"""
        result = deck_service.delete_deck(99999, test_user.id)
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.unit
    @patch('backend_app.services_new.deck_service.db.session.commit')
    def test_create_deck_database_error(self, mock_commit, deck_service, test_user, valid_deck_data):
        """Test manejo de error de base de datos"""
        mock_commit.side_effect = IntegrityError("Test error", None, None)
        
        result = deck_service.create_deck(test_user.id, valid_deck_data)
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.unit
    def test_get_public_decks(self, deck_service, test_user, db_session):
        """Test obtener decks públicos"""
        # Crear deck público
        public_deck = Deck(
            user_id=test_user.id,
            name='Public Deck',
            description='Public deck for testing',
            is_public=True
        )
        db_session.add(public_deck)
        db_session.commit()
        
        result = deck_service.get_public_decks()
        
        assert result['success'] is True
        assert len(result['data']) >= 1
        public_deck_found = any(deck['is_public'] for deck in result['data'])
        assert public_deck_found
    
    @pytest.mark.unit
    def test_search_decks(self, deck_service, test_user, test_deck):
        """Test buscar decks por nombre"""
        result = deck_service.search_decks(test_user.id, 'Test')
        
        assert result['success'] is True
        assert len(result['data']) >= 1
        assert any('Test' in deck['name'] for deck in result['data'])
    
    @pytest.mark.unit
    def test_get_deck_stats(self, deck_service, test_user, test_deck, test_flashcard):
        """Test obtener estadísticas del deck"""
        result = deck_service.get_deck_stats(test_deck.id, test_user.id)
        
        assert result['success'] is True
        assert 'total_cards' in result['data']
        assert result['data']['total_cards'] >= 1

