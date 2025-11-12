# react-flask-ecommerce/src/main.py based UI application integrated with Flask backend
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Mock database
orders = []
products = [
    {"id": 1, "name": "Laptop", "price": 999.99, "stock": 10},
    {"id": 2, "name": "Mouse", "price": 29.99, "stock": 50},
    {"id": 3, "name": "Keyboard", "price": 79.99, "stock": 30},
]

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify(products)

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    order = {
        "id": len(orders) + 1,
        "items": data.get("items", []),
        "total": data.get("total", 0),
        "timestamp": datetime.now().isoformat()
    }
    orders.append(order)
    return jsonify(order), 201

@app.route('/api/orders', methods=['GET'])
def get_orders():
    return jsonify(orders)

if __name__ == '__main__':
    app.run(debug=True, port=5000)