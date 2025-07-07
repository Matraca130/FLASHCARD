#!/usr/bin/env python3
"""
Script para verificar la congruencia de la lógica de creación de decks
Verifica toda la cadena: Creación → Almacenamiento → Algoritmos → Dashboard
"""

import os
import sys
import re
import json
from pathlib import Path

def print_section(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print('='*60)

def print_result(check, status, details=""):
    icon = "✅" if status else "❌"
    print(f"{icon} {check}")
    if details:
        print(f"   📝 {details}")

def check_file_exists(filepath, description):
    exists = os.path.exists(filepath)
    print_result(f"{description}: {filepath}", exists)
    return exists

def check_function_in_file(filepath, function_name, description):
    if not os.path.exists(filepath):
        print_result(f"{description}", False, f"Archivo {filepath} no existe")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        has_function = function_name in content
        print_result(f"{description}", has_function, f"Función '{function_name}' {'encontrada' if has_function else 'NO encontrada'}")
        return has_function

def check_class_in_file(filepath, class_name, description):
    if not os.path.exists(filepath):
        print_result(f"{description}", False, f"Archivo {filepath} no existe")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        has_class = f"class {class_name}" in content
        print_result(f"{description}", has_class, f"Clase '{class_name}' {'encontrada' if has_class else 'NO encontrada'}")
        return has_class

def check_relationship_in_model(filepath, relationship, description):
    if not os.path.exists(filepath):
        print_result(f"{description}", False, f"Archivo {filepath} no existe")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        has_relationship = relationship in content
        print_result(f"{description}", has_relationship, f"Relación '{relationship}' {'encontrada' if has_relationship else 'NO encontrada'}")
        return has_relationship

def verify_deck_creation_logic():
    """Verifica la lógica de creación de decks"""
    print_section("VERIFICACIÓN DE LÓGICA DE CREACIÓN DE DECKS")
    
    results = []
    
    # 1. Verificar modelo Deck
    print("\n📊 MODELOS DE DATOS:")
    results.append(check_class_in_file(
        "backend_app/models/models.py", 
        "Deck", 
        "Modelo Deck definido"
    ))
    
    results.append(check_relationship_in_model(
        "backend_app/models/models.py",
        "flashcards = relationship",
        "Relación Deck → Flashcards"
    ))
    
    results.append(check_relationship_in_model(
        "backend_app/models/models.py",
        "user_id",
        "Relación Deck → User (owner)"
    ))
    
    # 2. Verificar servicios de creación
    print("\n⚙️ SERVICIOS DE NEGOCIO:")
    results.append(check_function_in_file(
        "backend_app/services_new/deck_service.py",
        "create_deck",
        "Servicio de creación de decks"
    ))
    
    results.append(check_function_in_file(
        "backend_app/services_new/deck_service.py",
        "get_user_decks",
        "Servicio para obtener decks del usuario"
    ))
    
    results.append(check_function_in_file(
        "backend_app/services_new/flashcard_service.py",
        "create_flashcard",
        "Servicio de creación de flashcards"
    ))
    
    # 3. Verificar API endpoints
    print("\n🌐 API ENDPOINTS:")
    results.append(check_function_in_file(
        "backend_app/api/decks.py",
        "create_deck",
        "Endpoint POST para crear decks"
    ))
    
    results.append(check_function_in_file(
        "backend_app/api/decks.py",
        "get_decks",
        "Endpoint GET para listar decks"
    ))
    
    results.append(check_function_in_file(
        "backend_app/api/flashcards.py",
        "create_flashcard",
        "Endpoint POST para crear flashcards"
    ))
    
    # 4. Verificar frontend
    print("\n🎨 FRONTEND:")
    results.append(check_function_in_file(
        "create.service.js",
        "createDeck",
        "Función frontend para crear decks"
    ))
    
    results.append(check_function_in_file(
        "create.service.js",
        "createFlashcard",
        "Función frontend para crear flashcards"
    ))
    
    # 5. Verificar integración con algoritmos
    print("\n🧠 INTEGRACIÓN CON ALGORITMOS:")
    results.append(check_function_in_file(
        "backend_app/services_new/study_service.py",
        "get_cards_for_study",
        "Algoritmo obtiene flashcards de decks"
    ))
    
    results.append(check_function_in_file(
        "algorithms.service.js",
        "calculateNextReview",
        "Frontend usa datos de flashcards para algoritmos"
    ))
    
    # 6. Verificar integración con dashboard
    print("\n📈 INTEGRACIÓN CON DASHBOARD:")
    results.append(check_function_in_file(
        "backend_app/api/dashboard.py",
        "get_dashboard_stats",
        "Dashboard obtiene estadísticas de decks"
    ))
    
    results.append(check_function_in_file(
        "dashboard.service.js",
        "loadDashboardData",
        "Frontend carga datos de decks en dashboard"
    ))
    
    # 7. Verificar organización/carpetas
    print("\n📁 ORGANIZACIÓN Y CARPETAS:")
    results.append(check_function_in_file(
        "backend_app/models/models.py",
        "category",
        "Campo para categorizar/organizar decks"
    ))
    
    # Resumen final
    print_section("RESUMEN DE VERIFICACIÓN")
    passed = sum(results)
    total = len(results)
    percentage = (passed / total) * 100
    
    print(f"📊 Verificaciones pasadas: {passed}/{total} ({percentage:.1f}%)")
    
    if percentage >= 90:
        print("🎉 EXCELENTE: Tu lógica de decks está muy bien implementada")
    elif percentage >= 70:
        print("✅ BUENO: Tu lógica funciona, pero hay algunas mejoras posibles")
    elif percentage >= 50:
        print("⚠️  REGULAR: Funcionalidad básica presente, necesita mejoras")
    else:
        print("❌ CRÍTICO: Faltan componentes importantes de la lógica")
    
    return percentage

def check_data_flow():
    """Verifica el flujo de datos desde creación hasta uso"""
    print_section("VERIFICACIÓN DE FLUJO DE DATOS")
    
    print("🔄 FLUJO ESPERADO:")
    print("   1. Usuario crea Deck → 2. Deck almacena Flashcards → 3. Algoritmos usan datos → 4. Dashboard muestra estadísticas")
    
    # Verificar cada paso del flujo
    flow_checks = []
    
    print("\n📝 PASO 1: Creación de Deck")
    flow_checks.append(check_function_in_file(
        "create.service.js",
        "apiClient.post('/api/decks'",
        "Frontend envía datos al backend"
    ))
    
    print("\n💾 PASO 2: Almacenamiento de Flashcards")
    flow_checks.append(check_relationship_in_model(
        "backend_app/models/models.py",
        "deck_id",
        "Flashcards vinculadas a Deck"
    ))
    
    print("\n🧠 PASO 3: Algoritmos usan datos")
    flow_checks.append(check_function_in_file(
        "backend_app/services_new/study_service.py",
        "deck_id",
        "Algoritmos filtran por deck"
    ))
    
    print("\n📊 PASO 4: Dashboard muestra estadísticas")
    flow_checks.append(check_function_in_file(
        "dashboard.service.js",
        "deck",
        "Dashboard procesa datos de decks"
    ))
    
    flow_percentage = (sum(flow_checks) / len(flow_checks)) * 100
    print(f"\n📈 Flujo de datos: {sum(flow_checks)}/{len(flow_checks)} ({flow_percentage:.1f}%)")
    
    return flow_percentage

def main():
    print("🔍 VERIFICADOR DE CONGRUENCIA DE LÓGICA DE DECKS")
    print("=" * 60)
    print("Este script verifica si tu configuración soporta:")
    print("• Creación de decks")
    print("• Almacenamiento de flashcards en decks") 
    print("• Organización en carpetas/categorías")
    print("• Uso en algoritmos de estudio")
    print("• Visualización en dashboard")
    
    # Cambiar al directorio del proyecto
    os.chdir('/home/ubuntu/FLASHCARD')
    
    # Ejecutar verificaciones
    logic_score = verify_deck_creation_logic()
    flow_score = check_data_flow()
    
    # Puntuación final
    final_score = (logic_score + flow_score) / 2
    
    print_section("PUNTUACIÓN FINAL")
    print(f"🎯 Puntuación total: {final_score:.1f}%")
    
    if final_score >= 85:
        print("🏆 EXCELENTE: Tu lógica de decks es sólida y congruente")
        print("✨ Recomendación: Continúa con el desarrollo, la base es muy buena")
    elif final_score >= 70:
        print("👍 BUENO: La lógica funciona bien con algunas mejoras menores")
        print("🔧 Recomendación: Revisar los puntos marcados como ❌")
    elif final_score >= 50:
        print("⚠️  REGULAR: Funcionalidad básica presente, necesita trabajo")
        print("🛠️  Recomendación: Implementar los componentes faltantes")
    else:
        print("🚨 CRÍTICO: La lógica necesita reestructuración significativa")
        print("🔄 Recomendación: Revisar la arquitectura completa")

if __name__ == "__main__":
    main()

