import os
import sys

# Disable ChromaDB heavy local downloads during test execution
os.environ["TESTING"] = "True"

import shutil
import unittest

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from app.database.session import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.services.graph_service import GraphService

class TestPlantMindBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Clean existing DB to run tests on a fresh state
        db_path = "./plantmind.db"
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass
                
        # Explicitly build tables and seed SQLite database
        from main import seed_database
        seed_database()
        
        # Setup TestClient
        cls.client = TestClient(app)
        
        # Ensure directories exist
        os.makedirs("./uploads", exist_ok=True)
        os.makedirs("./vectorstore", exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        # Cleanup test DB if needed, keep main db intact
        db_path = "./plantmind.db"
        # We can close sessions first before deletion
        pass

    def test_01_read_root(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["platform"], "PlantMind AI OS")

    def test_02_auth_login_fail(self):
        # Invalid login
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "engineer@plantmind.com", "password": "wrongpassword"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_03_auth_login_success(self):
        # Valid login for Sarah Chen
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "engineer@plantmind.com", "password": "engineerpassword"}
        )
        self.assertEqual(response.status_code, 200)
        token_data = response.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")

        # Save token for subsequent tests
        self.__class__.token = token_data["access_token"]

    def test_04_get_profile(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        profile = response.json()
        self.assertEqual(profile["email"], "engineer@plantmind.com")
        self.assertEqual(profile["role"], "Engineer")

    def test_05_get_dashboard(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/dashboard", headers=headers)
        self.assertEqual(response.status_code, 200)
        dash_data = response.json()
        self.assertIn("stats", dash_data)
        self.assertIn("equipment_health", dash_data)
        self.assertGreater(len(dash_data["stats"]), 0)

    def test_06_get_documents_empty(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/documents", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_07_file_upload(self):
        # Write a dummy txt file for upload
        dummy_file = "test_sop.txt"
        with open(dummy_file, "w") as f:
            f.write("SOP-402: Under high thermal loading in Boiler Block B, open the superheater bypass valve FC-301.")

        headers = {"Authorization": f"Bearer {self.token}"}
        with open(dummy_file, "rb") as f:
            response = self.client.post(
                "/api/v1/upload",
                headers=headers,
                files={"file": (dummy_file, f, "text/plain")}
            )
        
        # Cleanup local test file
        if os.path.exists(dummy_file):
            os.remove(dummy_file)

        self.assertEqual(response.status_code, 200)
        doc_data = response.json()
        self.assertIn("id", doc_data)
        self.assertEqual(doc_data["filename"], "test_sop.txt")
        self.assertEqual(doc_data["type"], "txt")
        self.__class__.uploaded_doc_id = doc_data["id"]

    def test_08_get_document_metadata(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        doc_id = self.uploaded_doc_id
        response = self.client.get(f"/api/v1/document/{doc_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], doc_id)

    def test_09_graph_topology_query(self):
        # Query HTTP API to verify GraphService is running NetworkX parsing correctly
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/graph", headers=headers)
        self.assertEqual(response.status_code, 200)
        
        graph_data = response.json()
        self.assertIn("nodes", graph_data)
        self.assertIn("edges", graph_data)
        
        # Verify node types are properly parsed
        node_types = [n["type"] for n in graph_data["nodes"]]
        self.assertIn("equipment", node_types)
        self.assertIn("engineer", node_types)

    def test_10_document_delete_forbidden(self):
        # Engineers are NOT allowed to delete documents.
        # This tests role restrictions.
        headers = {"Authorization": f"Bearer {self.token}"}
        doc_id = self.uploaded_doc_id
        response = self.client.delete(f"/api/v1/document/{doc_id}", headers=headers)
        self.assertEqual(response.status_code, 403) # Forbidden

    def test_11_document_delete_admin_success(self):
        # Get admin token
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@plantmind.com", "password": "adminpassword"}
        )
        admin_token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Delete document
        doc_id = self.uploaded_doc_id
        delete_response = self.client.delete(f"/api/v1/document/{doc_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 204)

        # Confirm document is gone
        check_response = self.client.get(f"/api/v1/document/{doc_id}", headers=headers)
        self.assertEqual(check_response.status_code, 404)

    def test_12_copilot_query(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.post(
            "/api/v1/copilot/query",
            headers=headers,
            json={"query": "Boiler 3 thermal loading guidelines"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("content", data)
        self.assertIn("confidence", data)
        self.assertIn("thinkingSteps", data)
        self.assertIn("sources", data)

if __name__ == "__main__":
    unittest.main()
