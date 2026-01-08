from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from datetime import datetime
from werkzeug.utils import secure_filename
import os

db = SQLAlchemy()

class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filesize = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # study, labs, syllabus, tests
    mimetype = db.Column(db.String(100))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, default=1)  # Simple user system

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.filename,
            'size': self.filesize,
            'data': f"/files/{self.id}",
            'timestamp': int(self.upload_date.timestamp() * 1000)
        }
    def save_file(self, file_storage, upload_folder):
        filename = secure_filename(file_storage.filename)
        filepath = os.path.join(upload_folder, filename)
        file_storage.save(filepath)
        
        self.filename = filename
        self.filepath = filepath
        self.filesize = os.path.getsize(filepath)
        self.mimetype = file_storage.mimetype
        db.session.add(self)
        db.session.commit()
        return self
    