import os
from app import create_app

# Cargar variables de entorno desde .env
from dotenv import load_dotenv
load_dotenv()

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

