# Automated Integration Test Suite for Freelance Hub
import os
import unittest
import json
import sqlite3
import datetime
from backend.app import app
from backend.database import DATABASE_PATH, init_db

class FreelanceHubTestCase(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # We will use the test runner database file
        cls.test_db_path = os.path.join(os.path.dirname(__file__), 'backend', 'test_freelance_hub.db')
        os.environ['DATABASE_PATH'] = cls.test_db_path
        
        # Override database configuration path
        import backend.database
        backend.database.DATABASE_PATH = cls.test_db_path
        
        # Initialize test database
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
            
        backend.database.init_db()

    @classmethod
    def tearDownClass(cls):
        # Remove test database file
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_complete_workflow(self):
        print("\n--- Running Full API Workflow Integration Tests ---")

        # 1. Register Client & Freelancer
        print("Test 1: User Registration...")
        client_reg = self.app.post('/api/auth/register', json={
            'email': 'client@test.com',
            'password': 'password123',
            'role': 'client',
            'full_name': 'Test Client Corp'
        })
        self.assertEqual(client_reg.status_code, 201)
        
        freelancer_reg = self.app.post('/api/auth/register', json={
            'email': 'freelancer@test.com',
            'password': 'password123',
            'role': 'freelancer',
            'full_name': 'Dev Freelancer'
        })
        self.assertEqual(freelancer_reg.status_code, 201)

        # 2. Login Client
        print("Test 2: User Login & JWT Retrieval...")
        client_login = self.app.post('/api/auth/login', json={
            'email': 'client@test.com',
            'password': 'password123'
        })
        self.assertEqual(client_login.status_code, 200)
        client_data = json.loads(client_login.data)
        client_token = client_data['token']
        self.assertIsNotNone(client_token)

        # Login Freelancer
        freelancer_login = self.app.post('/api/auth/login', json={
            'email': 'freelancer@test.com',
            'password': 'password123'
        })
        self.assertEqual(freelancer_login.status_code, 200)
        freelancer_data = json.loads(freelancer_login.data)
        freelancer_token = freelancer_data['token']
        freelancer_id = freelancer_data['user']['id']

        # 3. Post a new Project listing (Client)
        print("Test 3: Post Project Listing...")
        headers_client = {'Authorization': f'Bearer {client_token}'}
        project_post = self.app.post('/api/projects', json={
            'title': 'Test Python REST Backend',
            'description': 'Need a fast python application built using Flask.',
            'category': 'Web Development',
            'budget': 1000.0,
            'deadline': (datetime.datetime.utcnow() + datetime.timedelta(days=10)).isoformat()
        }, headers=headers_client)
        self.assertEqual(project_post.status_code, 201)
        proj_data = json.loads(project_post.data)
        project_id = proj_data['project_id']
        
        # 4. Search projects (Public)
        print("Test 4: Searching Listings...")
        project_search = self.app.get(f'/api/projects?search=Python')
        self.assertEqual(project_search.status_code, 200)
        search_data = json.loads(project_search.data)
        self.assertTrue(len(search_data) > 0)

        # 5. Apply to project (Freelancer)
        print("Test 5: Submitting Proposal Application...")
        headers_freelancer = {'Authorization': f'Bearer {freelancer_token}'}
        apply_res = self.app.post(f'/api/projects/{project_id}/apply', json={
            'bid_amount': 950.0,
            'cover_letter': 'Hi, I have 5 years experience building Flask apps and databases.'
        }, headers=headers_freelancer)
        self.assertEqual(apply_res.status_code, 201)

        # 6. Hire Freelancer (Client)
        print("Test 6: Hire Decision...")
        hire_res = self.app.post(f'/api/projects/{project_id}/hire', json={
            'freelancer_id': freelancer_id
        }, headers=headers_client)
        self.assertEqual(hire_res.status_code, 200)
        hire_data = json.loads(hire_res.data)
        contract_id = hire_data['contract_id']

        # 7. Check Invoices & Pay Invoice (Client)
        print("Test 7: Escrow Payment & Invoicing...")
        invoice_list = self.app.get('/api/payments/invoices', headers=headers_client)
        self.assertEqual(invoice_list.status_code, 200)
        invoices = json.loads(invoice_list.data)
        self.assertTrue(len(invoices) > 0)
        pending_invoice = invoices[0]
        
        # Pay invoice
        pay_res = self.app.post(f'/api/payments/invoices/{pending_invoice["id"]}/pay', json={}, headers=headers_client)
        self.assertEqual(pay_res.status_code, 200)

        # 8. Send Chat Message
        print("Test 8: Workspace Discussions Chatting...")
        chat_res = self.app.post('/api/chat/messages', data={
            'receiver_id': freelancer_id,
            'message_text': 'Welcome aboard! Let me know when you can start work.',
            'project_id': project_id
        }, headers=headers_client)
        self.assertEqual(chat_res.status_code, 201)

        # 9. Deliver Completed Work (Freelancer)
        print("Test 9: Submit Deliverable...")
        submit_res = self.app.post(f'/api/projects/{project_id}/submit-work', json={
            'submission_notes': 'Implemented database, schemas, and blueprint API tests.'
        }, headers=headers_freelancer)
        self.assertEqual(submit_res.status_code, 200)

        # 10. Complete Project & Release Funds (Client)
        print("Test 10: Complete Contract & Payout...")
        complete_res = self.app.post(f'/api/projects/{project_id}/complete', json={}, headers=headers_client)
        self.assertEqual(complete_res.status_code, 200)

        # 11. Verify Wallet earnings balance transfer (Freelancer)
        print("Test 11: Wallet Balance Verification...")
        profile_res = self.app.get('/api/auth/profile', headers=headers_freelancer)
        self.assertEqual(profile_res.status_code, 200)
        profile_data = json.loads(profile_res.data)
        self.assertEqual(profile_data['balance'], 950.0)

        # 12. Submit Feedback Review
        print("Test 12: Mutual Rating & Review...")
        review_res = self.app.post('/api/reviews', json={
            'project_id': project_id,
            'reviewee_id': freelancer_id,
            'rating': 5,
            'review_text': 'Excellent speed and perfect delivery structure!'
        }, headers=headers_client)
        self.assertEqual(review_res.status_code, 201)

        print("\nAll integration test workflow steps completed successfully!")

if __name__ == '__main__':
    unittest.main()
