from flask import Flask, request, jsonify, send_from_directory, render_template, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import glob
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'web-study-hub-2026-jogeswar-login'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///web.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 15 * 1024 * 1024

# CRITICAL DEBUG - Shows exactly what Flask sees
print("=== FLASK STARTUP DEBUG ===")
print("Current directory:", os.getcwd())
print("Templates folder exists:", os.path.exists('templates'))
print("All files in templates:")
if os.path.exists('templates'):
    template_files = glob.glob("templates/*.html")
    for f in template_files:
        print(f"  FOUND: {f}")
    if not template_files:
        print("  NO HTML FILES FOUND IN TEMPLATES!")
else:
    print("  TEMPLATES FOLDER MISSING!")
print("==========================")

db = SQLAlchemy()
CORS(app)

# Create directories if missing
os.makedirs('uploads', exist_ok=True)
os.makedirs('static', exist_ok=True)
os.makedirs('templates', exist_ok=True)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filesize = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    mimetype = db.Column(db.String(100))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def to_dict(self):
        return {
            'id': self.id, 'name': self.filename, 'size': self.filesize,
            'data': f"/files/{self.id}", 'timestamp': int(self.upload_date.timestamp() * 1000)
        }

db.init_app(app)
with app.app_context():
    db.create_all()

@app.route('/debug')
def debug():
    """DEBUG: Shows exactly what files Flask can see"""
    info = {
        'cwd': os.getcwd(),
        'templates_exists': os.path.exists('templates'),
        'templates_contents': os.listdir('templates') if os.path.exists('templates') else [],
        'template_files': glob.glob('templates/*.html')
    }
    return jsonify(info)

@app.route('/', methods=['GET', 'POST'])
def index():
    print(f"REQUEST: {request.method}")
    print(f"Current dir: {os.getcwd()}")
    print(f"Templates exists: {os.path.exists('templates')}")
    print(f"index.html exists: {os.path.exists('templates/index.html')}")
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = username
            return redirect(url_for('dashboard'))
        elif username in ['joge', 'admin'] and password in ['joge', 'admin']:
            if not user:
                user = User(username=username, password=generate_password_hash(password))
                db.session.add(user)
                db.session.commit()
            session['user_id'] = user.id
            session['username'] = username
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password!')
    
    return render_template('index.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully!')
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/api/files/<category>')
def get_files(category):
    if 'user_id' not in session:
        return jsonify([]), 401
    files = File.query.filter_by(user_id=session['user_id'], category=category)\
                     .order_by(File.upload_date.desc()).limit(50).all()
    return jsonify([f.to_dict() for f in files])

@app.route('/api/files/upload', methods=['POST'])
def upload_file():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400
    
    category = request.form.get('category', 'study')
    if category not in ['study', 'labs', 'syllabus', 'tests']:
        category = 'study'
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    counter = 1
    base_name, ext = os.path.splitext(filename)
    while os.path.exists(filepath):
        filename = f"{base_name}_{counter}{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        counter += 1
    
    file.save(filepath)
    filesize = os.path.getsize(filepath)
    
    db_file = File(
        filename=filename, filepath=filepath, filesize=filesize,
        category=category, mimetype=file.content_type, user_id=session['user_id']
    )
    db.session.add(db_file)
    db.session.commit()
    
    return jsonify(db_file.to_dict())

@app.route('/api/files/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    file = File.query.get_or_404(file_id)
    if file.user_id != session['user_id']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        if os.path.exists(file.filepath):
            os.remove(file.filepath)
        db.session.delete(file)
        db.session.commit()
        return jsonify({'success': True})
    except:
        return jsonify({'error': 'Delete failed'}), 500

@app.route('/files/<int:file_id>')
def serve_file(file_id):
    if 'user_id' not in session:
        return redirect(url_for('index'))
    file = File.query.get_or_404(file_id)
    if file.user_id != session['user_id']:
        return "Unauthorized", 403
    return send_from_directory(os.path.dirname(file.filepath), os.path.basename(file.filepath))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
