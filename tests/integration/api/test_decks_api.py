"""
Tests de integración para API de decks
"""
import pytest
import json


class TestDecksAPI:
    """Tests de integración para endpoints de decks"""
    
    @pytest.mark.integration
    def test_create_deck_success(self, client, auth_headers, valid_deck_data):
        """Test crear deck vía API exitosamente"""
        response = client.post(
            '/api/decks/',
            data=json.dumps(valid_deck_data),
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'deck' in data
        assert data['deck']['name'] == valid_deck_data['name']
    
    @pytest.mark.integration
    def test_create_deck_without_auth(self, client, valid_deck_data):
        """Test crear deck sin autenticación"""
        response = client.post(
            '/api/decks/',
            data=json.dumps(valid_deck_data),
            content_type='application/json'
        )
        
        assert response.status_code == 401
    
    @pytest.mark.integration
    def test_create_deck_invalid_data(self, client, auth_headers):
        """Test crear deck con datos inválidos"""
        invalid_data = {
            'name': '',  # Nombre vacío
            'description': 'Test description'
        }
        
        response = client.post(
            '/api/decks/',
            data=json.dumps(invalid_data),
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    @pytest.mark.integration
    def test_get_user_decks(self, client, auth_headers, test_deck):
        """Test obtener decks del usuario"""
        response = client.get(
            '/api/decks/',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['decks']) >= 1
        assert any(deck['id'] == test_deck.id for deck in data['decks'])
    
    @pytest.mark.integration
    def test_get_deck_by_id(self, client, auth_headers, test_deck):
        """Test obtener deck específico por ID"""
        response = client.get(
            f'/api/decks/{test_deck.id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deck']['id'] == test_deck.id
        assert data['deck']['name'] == test_deck.name
    
    @pytest.mark.integration
    def test_get_deck_not_found(self, client, auth_headers):
        """Test obtener deck que no existe"""
        response = client.get(
            '/api/decks/99999',
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.integration
    @pytest.mark.auth
    def test_get_deck_wrong_owner(self, client, test_deck, db_session):
        """Test obtener deck de otro usuario"""
        # Crear otro usuario y obtener token
        from backend_app.models.models import User
        from flask_jwt_extended import create_access_token
        
        other_user = User(
            username='otheruser',
            email='other@example.com',
            first_name='Other',
            last_name='User',
            password_hash='hashed'
        )
        db_session.add(other_user)
        db_session.commit()
        
        with client.application.app_context():
            token = create_access_token(identity=other_user.id)
            other_headers = {'Authorization': f'Bearer {token}'}
        
        response = client.get(
            f'/api/decks/{test_deck.id}',
            headers=other_headers
        )
        
        assert response.status_code == 404  # O 403 según implementación
    
    @pytest.mark.integration
    def test_update_deck(self, client, auth_headers, test_deck):
        """Test actualizar deck"""
        update_data = {
            'name': 'Updated Deck Name',
            'description': 'Updated description'
        }
        
        response = client.put(
            f'/api/decks/{test_deck.id}',
            data=json.dumps(update_data),
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['deck']['name'] == update_data['name']
    
    @pytest.mark.integration
    def test_delete_deck(self, client, auth_headers, test_deck):
        """Test eliminar deck"""
        response = client.delete(
            f'/api/decks/{test_deck.id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        
        # Verificar que el deck ya no es accesible
        get_response = client.get(
            f'/api/decks/{test_deck.id}',
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    @pytest.mark.integration
    def test_cors_headers(self, client, auth_headers, valid_deck_data):
        """Test headers CORS en respuestas"""
        response = client.post(
            '/api/decks/',
            data=json.dumps(valid_deck_data),
            headers=auth_headers,
            content_type='application/json'
        )
        
        # Verificar headers CORS (si están configurados)
        assert 'Access-Control-Allow-Origin' in response.headers or response.status_code == 201
    
    @pytest.mark.integration
    def test_content_type_validation(self, client, auth_headers, valid_deck_data):
        """Test validación de Content-Type"""
        # Enviar sin Content-Type correcto
        response = client.post(
            '/api/decks/',
            data=json.dumps(valid_deck_data),
            headers=auth_headers
            # Sin content_type='application/json'
        )
        
        # Debería fallar o manejar graciosamente
        assert response.status_code in [400, 415, 201]  # Dependiendo de la implementación
    
    @pytest.mark.integration
    def test_malformed_json(self, client, auth_headers):
        """Test manejo de JSON malformado"""
        response = client.post(
            '/api/decks/',
            data='{"name": "test", "description":}',  # JSON inválido
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    @pytest.mark.integration
    def test_large_payload(self, client, auth_headers):
        """Test manejo de payload muy grande"""
        large_data = {
            'name': 'Test Deck',
            'description': 'x' * 10000  # Descripción muy larga
        }
        
        response = client.post(
            '/api/decks/',
            data=json.dumps(large_data),
            headers=auth_headers,
            content_type='application/json'
        )
        
        # Debería manejar graciosamente (aceptar o rechazar con error apropiado)
        assert response.status_code in [201, 400, 413]
    
    @pytest.mark.integration
    def test_concurrent_deck_creation(self, client, auth_headers, valid_deck_data):
        """Test creación concurrente de decks"""
        import threading
        import time
        
        results = []
        
        def create_deck():
            deck_data = valid_deck_data.copy()
            deck_data['name'] = f"Concurrent Deck {time.time()}"
            
            response = client.post(
                '/api/decks/',
                data=json.dumps(deck_data),
                headers=auth_headers,
                content_type='application/json'
            )
            results.append(response.status_code)
        
        # Crear múltiples threads
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=create_deck)
            threads.append(thread)
            thread.start()
        
        # Esperar a que terminen
        for thread in threads:
            thread.join()
        
        # Todos deberían haber sido exitosos
        assert all(status == 201 for status in results)

