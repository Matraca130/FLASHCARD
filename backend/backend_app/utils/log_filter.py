"""
Filtro inteligente de logs para StudyingFlash
Muestra solo errores reales, no menciones de "error" en comentarios o nombres
"""

import re
import logging
import sys


class IntelligentLogFilter(logging.Filter):
    """Filtro que solo permite errores reales, no menciones casuales de 'error'"""

    def __init__(self):
        super().__init__()
        # Patrones que indican errores reales
        self.real_error_patterns = [
            r'exception',
            r'traceback',
            r'failed',
            r'error:',  # Error seguido de dos puntos
            r'errno',
            r'critical',
            r'fatal',
            r'stack trace',
            r'assertion.*failed',
            r'test.*failed',
<<<<<<< HEAD
            r'exit code [1-9]',  # Exit codes de error
        ]
=======
            r'exit code [1-9]',  # Exit codes de err
            or ]
>>>>>>> 4a64f0c0b7272a924fb9959c73278447c3324b3f

        # Patrones que NO son errores reales
        self.false_positive_patterns = [
            r'def.*error',  # Nombres de funciones
            r'test.*error.*handling',  # Tests de manejo de errores
            r'#.*error',  # Comentarios
            r'""".*error.*"""',  # Docstrings
            r'error.*handling',  # Manejo de errores
            r'error.*message',  # Mensajes de error (no errores reales)
            r'potential.*error',  # Errores potenciales
            r'assert.*error.*in',  # Assertions que verifican errores
        ]

    def filter(self, record):
        """
        Filtra el log record
        Returns True si debe mostrarse, False si debe ocultarse
        """
        message = record.getMessage().lower()

        # Si no contiene "error", siempre mostrar
        if 'error' not in message:
            return True

        # Verificar si es un falso positivo
        for pattern in self.false_positive_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return False

        # Verificar si es un error real
        for pattern in self.real_error_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return True

        # Si contiene "error" pero no coincide con patrones específicos,
        # verificar el nivel de log
        return record.levelno >= logging.WARNING


def setup_intelligent_logging():
    """Configura logging inteligente para la aplicación"""

    # Configurar nivel de logging a WARNING para reducir ruido
    logging.basicConfig(
        level=logging.WARNING,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Aplicar filtro inteligente a todos los handlers
    intelligent_filter = IntelligentLogFilter()

    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        handler.addFilter(intelligent_filter)

    # Configurar loggers específicos
    loggers_to_configure = [
        'backend_app',
        'flask',
        'sqlalchemy',
        'werkzeug'
    ]

    for logger_name in loggers_to_configure:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.WARNING)
        for handler in logger.handlers:
            handler.addFilter(intelligent_filter)


def filter_log_output(log_lines):
    """
    Filtra líneas de log para mostrar solo errores reales
    Útil para procesar logs de CI/CD
    """
    filtered_lines = []

    for line in log_lines:
        line_lower = line.lower()

        # Si no contiene "error", incluir
        if 'error' not in line_lower:
            filtered_lines.append(line)
            continue

        # Verificar si es error real
        is_real_error = any([
            'exception' in line_lower,
            'traceback' in line_lower,
            'failed' in line_lower,
            'error:' in line_lower,
            'critical' in line_lower,
            'fatal' in line_lower,
            'exit code' in line_lower and any(c.isdigit() and c != '0' for c in line),
        ])

        # Verificar si es falso positivo
        is_false_positive = any([
            'def ' in line_lower and 'error' in line_lower,
            'test_' in line_lower and 'error' in line_lower and 'handling' in line_lower,
            line_lower.strip().startswith('#'),
            'assert' in line_lower and 'error' in line_lower and 'in' in line_lower,
        ])

        if is_real_error and not is_false_positive:
            filtered_lines.append(line)

    return filtered_lines


if __name__ == "__main__":
    # Ejemplo de uso para filtrar logs de CI/CD
    if len(sys.argv) > 1:
        log_file = sys.argv[1]
        with open(log_file, 'r') as f:
            lines = f.readlines()

        filtered = filter_log_output(lines)

        print("=== ERRORES REALES ENCONTRADOS ===")
        for line in filtered:
            if 'error' in line.lower():
                print(line.strip())
    else:
        print("Uso: python log_filter.py <archivo_de_log>")
