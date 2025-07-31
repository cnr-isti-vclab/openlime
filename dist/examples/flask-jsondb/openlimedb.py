import json
import os
from flask import Blueprint, request, jsonify

# Configuration
DBNAME = os.environ.get('DBFNAME', 'anno.json')

class DB:
    def __init__(self, dbname):
        self.dbname = dbname
        try:
            with open(self.dbname, 'r') as f:
                self.db = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.db = []
    
    def dbwrite(self):
        with open(self.dbname, 'w') as f:
            json.dump(self.db, f, indent=2)
    
    def dbread(self):
        return self.db
    
    def dbcreate(self, item):
        item['id'] = str(item['id'])
        self.db.append(item)
        self.dbwrite()
        return {
            'status': 'ok',
            'message': 'Annotation created successfully'
        }
    
    def dbupdate(self, id, item):
        idx = -1
        for i, record in enumerate(self.db):
            if record['id'] == str(id):
                idx = i
                break
        
        if idx >= 0:
            item['id'] = str(id)
            self.db[idx] = item
            self.dbwrite()
            return {
                'status': 'ok',
                'message': 'Annotation updated successfully'
            }
        else:
            return {
                'status': 'err',
                'message': 'Error in updating annotation'
            }
    
    def dbdelete(self, id):
        idx = -1
        for i, record in enumerate(self.db):
            if record['id'] == str(id):
                idx = i
                break
        
        if idx >= 0:
            self.db.pop(idx)
            self.dbwrite()
            return {
                'status': 'ok',
                'message': 'Annotation deleted successfully'
            }
        else:
            return {
                'status': 'err',
                'message': 'Error in deleting annotation'
            }

# Initialize the database
db = DB(DBNAME)

# Create Blueprint (equivalent to Express router)
bp = Blueprint('openlimedb', __name__)

@bp.route('/', methods=['GET'])
@bp.route('', methods=['GET'])  # Handle requests without trailing slash
def get_annotations():
    """GET annotations"""
    try:
        result = db.dbread()
        return jsonify(result)
    except Exception as e:
        print(f"Error while getting annotation: {str(e)}")
        return jsonify({'status': 'err', 'message': str(e)}), 500

@bp.route('/', methods=['POST'])
@bp.route('', methods=['POST'])  # Handle requests without trailing slash
def create_annotation():
    """POST annotation"""
    try:
        result = db.dbcreate(request.json)
        if result['status'] == 'err':
            print(f"Error while creating annotation: {result['message']}")
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        print(f"Error while creating annotation: {str(e)}")
        return jsonify({'status': 'err', 'message': str(e)}), 500

@bp.route('/<id>', methods=['PUT'])
def update_annotation(id):
    """PUT annotation"""
    try:
        result = db.dbupdate(id, request.json)
        if result['status'] == 'err':
            print(f"Error while updating annotation: {result['message']}")
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        print(f"Error while updating annotation: {str(e)}")
        return jsonify({'status': 'err', 'message': str(e)}), 500

@bp.route('/<id>', methods=['DELETE'])
def delete_annotation(id):
    """DELETE annotation"""
    try:
        result = db.dbdelete(id)
        if result['status'] == 'err':
            print(f"Error while deleting annotation: {result['message']}")
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        print(f"Error while deleting annotation: {str(e)}")
        return jsonify({'status': 'err', 'message': str(e)}), 500
