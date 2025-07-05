"""
Modelo para refresh tokens
"""
from datetime import datetime, timedelta
from backend_app.models.models import db, BaseModel


class RefreshToken(BaseModel):
    """Modelo para tokens de actualización"""
    __tablename__ = 'refresh_tokens'
    
    # Campos principales
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    
    # Metadatos de seguridad
    device_info = db.Column(db.Text)  # User agent, device info
    ip_address = db.Column(db.String(45))  # IPv4 o IPv6
    last_used = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Estado del token
    is_revoked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime)
    revoked_reason = db.Column(db.String(100))  # 'logout', 'security', 'expired', etc.
    
    # Relaciones
    user = db.relationship('User', backref=db.backref('refresh_tokens', lazy='dynamic'))
    
    def __init__(self, user_id, token_hash, expires_at=None, device_info=None, ip_address=None):
        super().__init__()
        self.user_id = user_id
        self.token_hash = token_hash
        self.expires_at = expires_at or (datetime.utcnow() + timedelta(days=30))
        self.device_info = device_info
        self.ip_address = ip_address
    
    def is_valid(self):
        """Verificar si el token es válido"""
        return (
            not self.is_revoked and 
            not self.is_deleted and 
            self.expires_at > datetime.utcnow()
        )
    
    def revoke(self, reason='manual'):
        """Revocar el token"""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()
        self.revoked_reason = reason
    
    def update_last_used(self):
        """Actualizar última vez usado"""
        self.last_used = datetime.utcnow()
    
    def to_dict(self):
        """Convertir a diccionario (sin datos sensibles)"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'device_info': self.device_info,
            'ip_address': self.ip_address,
            'is_revoked': self.is_revoked,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def cleanup_expired(cls):
        """Limpiar tokens expirados (tarea de mantenimiento)"""
        expired_tokens = cls.query.filter(
            cls.expires_at < datetime.utcnow(),
            cls.is_deleted == False
        ).all()
        
        for token in expired_tokens:
            token.soft_delete()
        
        db.session.commit()
        return len(expired_tokens)
    
    @classmethod
    def revoke_all_for_user(cls, user_id, reason='logout_all'):
        """Revocar todos los tokens de un usuario"""
        tokens = cls.query.filter(
            cls.user_id == user_id,
            cls.is_revoked == False,
            cls.is_deleted == False
        ).all()
        
        for token in tokens:
            token.revoke(reason)
        
        db.session.commit()
        return len(tokens)
    
    @classmethod
    def get_valid_token(cls, token_hash):
        """Obtener token válido por hash"""
        return cls.query.filter(
            cls.token_hash == token_hash,
            cls.is_revoked == False,
            cls.is_deleted == False,
            cls.expires_at > datetime.utcnow()
        ).first()
    
    @classmethod
    def get_user_tokens(cls, user_id, active_only=True):
        """Obtener tokens de un usuario"""
        query = cls.query.filter(
            cls.user_id == user_id,
            cls.is_deleted == False
        )
        
        if active_only:
            query = query.filter(
                cls.is_revoked == False,
                cls.expires_at > datetime.utcnow()
            )
        
        return query.order_by(cls.last_used.desc()).all()
    
    def __repr__(self):
        return f'<RefreshToken {self.id} for User {self.user_id}>'

