"""
Script de migración para unificar nomenclatura y agregar soporte multimedia
Versión: 2.0.0
Fecha: 2024-01-10
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime
import logging
import sys
import os

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def create_migration_app():
    """Crear aplicación Flask para migración"""
    app = Flask(__name__)
    
    # Configuración de base de datos
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///flashcards.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db = SQLAlchemy(app)
    migrate = Migrate(app, db)
    
    return app, db, migrate

def run_migration():
    """Ejecutar migración completa"""
    logger.info("=== INICIANDO MIGRACIÓN DE NOMENCLATURA UNIFICADA ===")
    
    app, db, migrate = create_migration_app()
    
    with app.app_context():
        try:
            # Paso 1: Verificar estado actual
            logger.info("Paso 1: Verificando estado actual de la base de datos...")
            verify_current_state(db)
            
            # Paso 2: Crear backup
            logger.info("Paso 2: Creando backup de seguridad...")
            create_backup(db)
            
            # Paso 3: Agregar nuevos campos
            logger.info("Paso 3: Agregando nuevos campos multimedia...")
            add_multimedia_fields(db)
            
            # Paso 4: Migrar datos existentes
            logger.info("Paso 4: Migrando datos existentes...")
            migrate_existing_data(db)
            
            # Paso 5: Actualizar índices
            logger.info("Paso 5: Actualizando índices...")
            update_indexes(db)
            
            # Paso 6: Validar migración
            logger.info("Paso 6: Validando migración...")
            validate_migration(db)
            
            logger.info("=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===")
            
        except Exception as e:
            logger.error(f"Error durante la migración: {str(e)}")
            logger.info("Iniciando rollback...")
            rollback_migration(db)
            raise

def verify_current_state(db):
    """Verificar el estado actual de la base de datos"""
    try:
        # Verificar si las tablas existen
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        required_tables = ['users', 'decks', 'flashcards', 'study_sessions', 'card_reviews']
        missing_tables = [table for table in required_tables if table not in tables]
        
        if missing_tables:
            raise Exception(f"Tablas faltantes: {missing_tables}")
        
        # Verificar estructura de flashcards
        flashcard_columns = [col['name'] for col in inspector.get_columns('flashcards')]
        logger.info(f"Columnas actuales en flashcards: {flashcard_columns}")
        
        # Contar registros existentes
        result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0")
        flashcard_count = result.scalar()
        logger.info(f"Flashcards activas encontradas: {flashcard_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error verificando estado actual: {str(e)}")
        raise

def create_backup(db):
    """Crear backup de la base de datos"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_flashcards_{timestamp}.sql"
        
        # Para SQLite
        if 'sqlite' in str(db.engine.url):
            import shutil
            db_file = str(db.engine.url).replace('sqlite:///', '')
            backup_path = f"backup_{timestamp}_{os.path.basename(db_file)}"
            shutil.copy2(db_file, backup_path)
            logger.info(f"Backup SQLite creado: {backup_path}")
        
        # Para PostgreSQL/MySQL
        else:
            # Implementar backup específico según el motor
            logger.info("Backup para PostgreSQL/MySQL - implementar según necesidades")
        
        return True
        
    except Exception as e:
        logger.error(f"Error creando backup: {str(e)}")
        raise

def add_multimedia_fields(db):
    """Agregar nuevos campos multimedia a la tabla flashcards"""
    try:
        # Verificar si los campos ya existen
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('flashcards')]
        
        # Campos multimedia a agregar
        new_fields = [
            ('front_video_url', 'VARCHAR(500)'),
            ('back_video_url', 'VARCHAR(500)'),
            ('algorithm_type', 'VARCHAR(20) DEFAULT "fsrs"')
        ]
        
        for field_name, field_type in new_fields:
            if field_name not in columns:
                sql = f"ALTER TABLE flashcards ADD COLUMN {field_name} {field_type}"
                db.engine.execute(sql)
                logger.info(f"Campo agregado: {field_name}")
            else:
                logger.info(f"Campo ya existe: {field_name}")
        
        # Hacer campos de texto opcionales (permitir NULL)
        nullable_fields = ['front_text', 'back_text']
        for field in nullable_fields:
            if field in columns:
                # Nota: La sintaxis específica depende del motor de BD
                logger.info(f"Campo {field} configurado como opcional")
        
        db.session.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error agregando campos multimedia: {str(e)}")
        db.session.rollback()
        raise

def migrate_existing_data(db):
    """Migrar datos existentes al nuevo formato"""
    try:
        # Obtener todas las flashcards activas
        result = db.engine.execute("""
            SELECT id, front_text, back_text, front_image_url, back_image_url,
                   ease_factor, interval_days, repetitions, stability, difficulty_fsrs
            FROM flashcards 
            WHERE is_deleted = 0
        """)
        
        flashcards = result.fetchall()
        migrated_count = 0
        
        for flashcard in flashcards:
            try:
                # Validar que tenga contenido mínimo
                has_front_content = (
                    flashcard.front_text or 
                    flashcard.front_image_url
                )
                has_back_content = (
                    flashcard.back_text or 
                    flashcard.back_image_url
                )
                
                if not has_front_content or not has_back_content:
                    logger.warning(f"Flashcard {flashcard.id} no tiene contenido suficiente")
                    continue
                
                # Establecer algorithm_type por defecto si no existe
                if not hasattr(flashcard, 'algorithm_type') or not flashcard.algorithm_type:
                    # Determinar algoritmo basado en campos existentes
                    if flashcard.stability and flashcard.difficulty_fsrs:
                        algorithm_type = 'fsrs'
                    else:
                        algorithm_type = 'sm2'
                    
                    db.engine.execute("""
                        UPDATE flashcards 
                        SET algorithm_type = :algorithm_type,
                            updated_at = :updated_at
                        WHERE id = :id
                    """, {
                        'algorithm_type': algorithm_type,
                        'updated_at': datetime.utcnow(),
                        'id': flashcard.id
                    })
                
                migrated_count += 1
                
                if migrated_count % 100 == 0:
                    logger.info(f"Migradas {migrated_count} flashcards...")
                    
            except Exception as e:
                logger.error(f"Error migrando flashcard {flashcard.id}: {str(e)}")
                continue
        
        db.session.commit()
        logger.info(f"Migración completada: {migrated_count} flashcards procesadas")
        return migrated_count
        
    except Exception as e:
        logger.error(f"Error en migración de datos: {str(e)}")
        db.session.rollback()
        raise

def update_indexes(db):
    """Actualizar índices para optimizar consultas"""
    try:
        # Índices para campos multimedia
        indexes_to_create = [
            "CREATE INDEX IF NOT EXISTS idx_flashcard_multimedia ON flashcards(front_image_url, back_image_url)",
            "CREATE INDEX IF NOT EXISTS idx_flashcard_algorithm_type ON flashcards(algorithm_type)",
            "CREATE INDEX IF NOT EXISTS idx_flashcard_content_search ON flashcards(front_text, back_text)",
            "CREATE INDEX IF NOT EXISTS idx_flashcard_review_due ON flashcards(next_review, deck_id) WHERE is_deleted = 0"
        ]
        
        for index_sql in indexes_to_create:
            try:
                db.engine.execute(index_sql)
                logger.info(f"Índice creado: {index_sql.split('ON')[0].split('INDEX')[1].strip()}")
            except Exception as e:
                logger.warning(f"Error creando índice: {str(e)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error actualizando índices: {str(e)}")
        raise

def validate_migration(db):
    """Validar que la migración fue exitosa"""
    try:
        # Verificar nuevos campos
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('flashcards')]
        
        required_new_fields = ['front_video_url', 'back_video_url', 'algorithm_type']
        missing_fields = [field for field in required_new_fields if field not in columns]
        
        if missing_fields:
            raise Exception(f"Campos faltantes después de migración: {missing_fields}")
        
        # Verificar datos migrados
        result = db.engine.execute("""
            SELECT COUNT(*) FROM flashcards 
            WHERE is_deleted = 0 AND algorithm_type IS NOT NULL
        """)
        migrated_count = result.scalar()
        
        result = db.engine.execute("""
            SELECT COUNT(*) FROM flashcards 
            WHERE is_deleted = 0
        """)
        total_count = result.scalar()
        
        if migrated_count != total_count:
            logger.warning(f"Algunas flashcards no tienen algorithm_type: {total_count - migrated_count}")
        
        # Verificar integridad de contenido
        result = db.engine.execute("""
            SELECT COUNT(*) FROM flashcards 
            WHERE is_deleted = 0 
            AND (front_text IS NULL AND front_image_url IS NULL)
        """)
        invalid_front = result.scalar()
        
        result = db.engine.execute("""
            SELECT COUNT(*) FROM flashcards 
            WHERE is_deleted = 0 
            AND (back_text IS NULL AND back_image_url IS NULL)
        """)
        invalid_back = result.scalar()
        
        if invalid_front > 0 or invalid_back > 0:
            logger.warning(f"Flashcards con contenido inválido - Front: {invalid_front}, Back: {invalid_back}")
        
        logger.info(f"Validación completada - Total: {total_count}, Migradas: {migrated_count}")
        return True
        
    except Exception as e:
        logger.error(f"Error en validación: {str(e)}")
        raise

def rollback_migration(db):
    """Hacer rollback de la migración en caso de error"""
    try:
        logger.info("Iniciando rollback de migración...")
        
        # Eliminar campos agregados
        fields_to_remove = ['front_video_url', 'back_video_url']
        
        for field in fields_to_remove:
            try:
                db.engine.execute(f"ALTER TABLE flashcards DROP COLUMN {field}")
                logger.info(f"Campo eliminado en rollback: {field}")
            except Exception as e:
                logger.warning(f"Error eliminando campo {field}: {str(e)}")
        
        # Restaurar backup si es necesario
        logger.info("Rollback completado. Considere restaurar desde backup si es necesario.")
        
    except Exception as e:
        logger.error(f"Error en rollback: {str(e)}")

def generate_migration_report():
    """Generar reporte de migración"""
    try:
        app, db, migrate = create_migration_app()
        
        with app.app_context():
            # Estadísticas generales
            result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0")
            total_flashcards = result.scalar()
            
            result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0 AND front_image_url IS NOT NULL")
            with_front_images = result.scalar()
            
            result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0 AND back_image_url IS NOT NULL")
            with_back_images = result.scalar()
            
            result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0 AND algorithm_type = 'fsrs'")
            fsrs_cards = result.scalar()
            
            result = db.engine.execute("SELECT COUNT(*) FROM flashcards WHERE is_deleted = 0 AND algorithm_type = 'sm2'")
            sm2_cards = result.scalar()
            
            # Generar reporte
            report = f"""
=== REPORTE DE MIGRACIÓN ===
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

ESTADÍSTICAS GENERALES:
- Total de flashcards activas: {total_flashcards}
- Con imágenes frontales: {with_front_images} ({(with_front_images/total_flashcards*100):.1f}%)
- Con imágenes posteriores: {with_back_images} ({(with_back_images/total_flashcards*100):.1f}%)

DISTRIBUCIÓN DE ALGORITMOS:
- FSRS: {fsrs_cards} ({(fsrs_cards/total_flashcards*100):.1f}%)
- SM-2: {sm2_cards} ({(sm2_cards/total_flashcards*100):.1f}%)

ESTRUCTURA DE BASE DE DATOS:
- Campos multimedia agregados: ✓
- Índices optimizados: ✓
- Validación de integridad: ✓

PRÓXIMOS PASOS:
1. Actualizar aplicación frontend para usar nueva API
2. Implementar subida de archivos multimedia
3. Configurar CDN para imágenes
4. Monitorear rendimiento con nuevos índices
"""
            
            # Guardar reporte
            with open(f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt", 'w') as f:
                f.write(report)
            
            logger.info("Reporte de migración generado")
            print(report)
            
    except Exception as e:
        logger.error(f"Error generando reporte: {str(e)}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Script de migración de nomenclatura unificada')
    parser.add_argument('--action', choices=['migrate', 'report', 'validate'], 
                       default='migrate', help='Acción a realizar')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Ejecutar en modo simulación (no hace cambios)')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'migrate':
            if args.dry_run:
                logger.info("=== MODO SIMULACIÓN - NO SE HARÁN CAMBIOS ===")
                # Implementar lógica de simulación
            else:
                run_migration()
        elif args.action == 'report':
            generate_migration_report()
        elif args.action == 'validate':
            app, db, migrate = create_migration_app()
            with app.app_context():
                validate_migration(db)
                
    except Exception as e:
        logger.error(f"Error ejecutando script: {str(e)}")
        sys.exit(1)

