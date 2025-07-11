#!/usr/bin/env python3
"""
Script para verificar la integración completa de creación de flashcards y decks
Verifica la cadena completa: Frontend → API → Backend → Base de datos
"""

import os
import sys
import re
import json
from pathlib import Path

def print_section(title):
    print(f"\n{'='*70}")
    print(f"🔍 {title}")
    print('='*70)

def print_result(check, status, details=""):
    icon = "✅" if status else "❌"
    print(f"{icon} {check}")
    if details:
        print(f"   📝 {details}")

def check_file_content(filepath, patterns, description):
    """Verifica que un archivo contenga ciertos patrones"""
    if not os.path.exists(filepath):
        print_result(f"{description}", False, f"Archivo {filepath} no existe")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    found_patterns = []
    missing_patterns = []
    
    for pattern_name, pattern in patterns.items():
        if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
            found_patterns.append(pattern_name)
        else:
            missing_patterns.append(pattern_name)
    
    success = len(missing_patterns) == 0
    details = f"Encontrado: {found_patterns}" if found_patterns else ""
    if missing_patterns:
        details += f" | Faltante: {missing_patterns}"
    
    print_result(f"{description}", success, details)
    return success

def verify_frontend_create_interface():
    """Verifica la interfaz de creación en el frontend"""
    print_section("INTERFAZ DE CREACIÓN - FRONTEND")
    
    results = []
    
    # 1. Verificar formularios de creación en index.html
    html_patterns = {
        "deck_form": r'<form[^>]*deck[^>]*>|<div[^>]*deck.*form',
        "flashcard_form": r'<form[^>]*flashcard[^>]*>|<div[^>]*flashcard.*form',
        "create_button": r'<button[^>]*crear|<button[^>]*create',
        "input_fields": r'<input[^>]*name|<textarea[^>]*>',
    }
    
    results.append(check_file_content(
        "index.html", 
        html_patterns, 
        "Formularios de creación en HTML"
    ))
    
    # 2. Verificar servicios de creación JavaScript
    create_service_patterns = {
        "createDeck_function": r'function\s+createDeck|createDeck\s*[:=]',
        "createFlashcard_function": r'function\s+createFlashcard|createFlashcard\s*[:=]',
        "api_post_deck": r'post.*["\']/?api/decks["\']',
        "api_post_flashcard": r'post.*["\']/?api/flashcards["\']',
        "form_validation": r'validate|required|error',
    }
    
    results.append(check_file_content(
        "create.service.js", 
        create_service_patterns, 
        "Servicios de creación JavaScript"
    ))
    
    # 3. Verificar cliente API
    api_client_patterns = {
        "post_method": r'post\s*\(',
        "deck_endpoint": r'["\']/?api/decks["\']',
        "flashcard_endpoint": r'["\']/?api/flashcards["\']',
        "error_handling": r'catch|error|try',
    }
    
    results.append(check_file_content(
        "apiClient.js", 
        api_client_patterns, 
        "Cliente API para requests"
    ))
    
    return results

def verify_backend_api_endpoints():
    """Verifica los endpoints de API en el backend"""
    print_section("ENDPOINTS DE API - BACKEND")
    
    results = []
    
    # 1. Verificar endpoints de decks
    deck_api_patterns = {
        "post_route": r'@.*\.route.*POST|def.*create.*deck',
        "get_route": r'@.*\.route.*GET|def.*get.*deck',
        "request_json": r'request\.get_json|request\.json',
        "validation": r'validate|schema|required',
        "response_json": r'jsonify|return.*json',
    }
    
    results.append(check_file_content(
        "backend_app/api/decks.py", 
        deck_api_patterns, 
        "API endpoints para decks"
    ))
    
    # 2. Verificar endpoints de flashcards
    flashcard_api_patterns = {
        "post_route": r'@.*\.route.*POST|def.*create.*flashcard',
        "deck_relationship": r'deck_id|deck\.id',
        "content_fields": r'front_text|back_text',
        "validation": r'validate|schema|required',
    }
    
    results.append(check_file_content(
        "backend_app/api/flashcards.py", 
        flashcard_api_patterns, 
        "API endpoints para flashcards"
    ))
    
    return results

def verify_backend_services():
    """Verifica los servicios de negocio en el backend"""
    print_section("SERVICIOS DE NEGOCIO - BACKEND")
    
    results = []
    
    # 1. Verificar servicio de decks
    deck_service_patterns = {
        "create_deck_method": r'def\s+create_deck',
        "user_validation": r'user_id|user\.id',
        "database_save": r'db\.session\.add|session\.add',
        "commit": r'db\.session\.commit|session\.commit',
        "error_handling": r'try:|except:|catch',
    }
    
    results.append(check_file_content(
        "backend_app/services_new/deck_service.py", 
        deck_service_patterns, 
        "Servicio de creación de decks"
    ))
    
    # 2. Verificar servicio de flashcards
    flashcard_service_patterns = {
        "create_flashcard_method": r'def\s+create_flashcard',
        "deck_validation": r'deck_id|deck\.id',
        "content_validation": r'front_text|back_text',
        "algorithm_fields": r'ease_factor|interval_days|stability',
    }
    
    results.append(check_file_content(
        "backend_app/services_new/flashcard_service.py", 
        flashcard_service_patterns, 
        "Servicio de creación de flashcards"
    ))
    
    return results

def verify_database_models():
    """Verifica los modelos de base de datos"""
    print_section("MODELOS DE BASE DE DATOS")
    
    results = []
    
    model_patterns = {
        "deck_model": r'class\s+Deck',
        "flashcard_model": r'class\s+Flashcard',
        "deck_flashcard_relationship": r'relationship.*flashcard|flashcard.*relationship',
        "user_deck_relationship": r'user_id.*ForeignKey|ForeignKey.*user',
        "required_fields": r'nullable=False',
    }
    
    results.append(check_file_content(
        "backend_app/models/models.py", 
        model_patterns, 
        "Modelos de base de datos"
    ))
    
    return results

def verify_integration_flow():
    """Verifica el flujo completo de integración"""
    print_section("FLUJO DE INTEGRACIÓN COMPLETO")
    
    print("🔄 FLUJO ESPERADO:")
    print("   1. Usuario llena formulario → 2. JavaScript valida → 3. API request → 4. Backend procesa → 5. Base de datos guarda")
    
    integration_checks = []
    
    # Verificar que el frontend puede comunicarse con el backend
    print("\n📡 COMUNICACIÓN FRONTEND ↔ BACKEND:")
    
    # Verificar configuración de API
    if os.path.exists("apiClient.js"):
        with open("apiClient.js", 'r') as f:
            content = f.read()
            has_backend_url = "localhost:5000" in content or "onrender.com" in content
            integration_checks.append(has_backend_url)
            print_result("URL del backend configurada", has_backend_url)
    
    # Verificar CORS en backend
    if os.path.exists("backend_app/__init__.py"):
        with open("backend_app/__init__.py", 'r') as f:
            content = f.read()
            has_cors = "CORS" in content
            integration_checks.append(has_cors)
            print_result("CORS configurado en backend", has_cors)
    
    return integration_checks

def verify_user_workflow():
    """Verifica el flujo de trabajo del usuario"""
    print_section("FLUJO DE TRABAJO DEL USUARIO")
    
    workflow_checks = []
    
    print("👤 PASOS DEL USUARIO:")
    print("   1. Navegar a sección 'Crear'")
    print("   2. Llenar formulario de deck")
    print("   3. Crear deck")
    print("   4. Agregar flashcards al deck")
    print("   5. Ver deck creado en 'Gestionar'")
    
    # Verificar navegación
    if os.path.exists("index.html"):
        with open("index.html", 'r') as f:
            content = f.read()
            has_navigation = "Crear" in content and "Gestionar" in content
            workflow_checks.append(has_navigation)
            print_result("Navegación entre secciones", has_navigation)
    
    # Verificar persistencia de datos
    if os.path.exists("dashboard.service.js"):
        with open("dashboard.service.js", 'r') as f:
            content = f.read()
            has_data_loading = "loadDashboardData" in content or "getDashboardStats" in content
            workflow_checks.append(has_data_loading)
            print_result("Carga de datos en dashboard", has_data_loading)
    
    return workflow_checks

def main():
    print("🔍 VERIFICADOR DE INTEGRACIÓN DE CREACIÓN DE FLASHCARDS Y DECKS")
    print("=" * 70)
    print("Este script verifica la integración completa desde la interfaz hasta la base de datos")
    
    # Cambiar al directorio del proyecto
    os.chdir('/home/ubuntu/FLASHCARD')
    
    # Ejecutar verificaciones
    frontend_results = verify_frontend_create_interface()
    backend_api_results = verify_backend_api_endpoints()
    backend_service_results = verify_backend_services()
    database_results = verify_database_models()
    integration_results = verify_integration_flow()
    workflow_results = verify_user_workflow()
    
    # Calcular puntuación total
    all_results = (frontend_results + backend_api_results + backend_service_results + 
                  database_results + integration_results + workflow_results)
    
    passed = sum(all_results)
    total = len(all_results)
    percentage = (passed / total) * 100 if total > 0 else 0
    
    print_section("RESUMEN DE INTEGRACIÓN")
    print(f"📊 Verificaciones pasadas: {passed}/{total} ({percentage:.1f}%)")
    
    if percentage >= 90:
        print("🎉 EXCELENTE: La integración de creación está muy bien implementada")
        print("✨ Recomendación: La funcionalidad debería funcionar sin problemas")
    elif percentage >= 75:
        print("👍 BUENO: La integración funciona bien con algunas mejoras menores")
        print("🔧 Recomendación: Revisar los puntos marcados como ❌")
    elif percentage >= 60:
        print("⚠️  REGULAR: Funcionalidad básica presente, necesita trabajo")
        print("🛠️  Recomendación: Implementar los componentes faltantes")
    else:
        print("🚨 CRÍTICO: La integración necesita trabajo significativo")
        print("🔄 Recomendación: Revisar la arquitectura completa")
    
    print("\n📋 ARCHIVOS CLAVE PARA ANALIZAR:")
    print("Frontend: index.html, create.service.js, apiClient.js")
    print("Backend: backend_app/api/decks.py, backend_app/api/flashcards.py")
    print("Servicios: backend_app/services_new/deck_service.py, backend_app/services_new/flashcard_service.py")
    print("Modelos: backend_app/models/models.py")

if __name__ == "__main__":
    main()

