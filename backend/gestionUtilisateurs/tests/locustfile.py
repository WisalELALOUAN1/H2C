from locust import HttpUser, task, between
import random

# Identifiants/IDs d'utilisateurs existants
ADMIN_EMAIL = "test@gmail.com"
ADMIN_PASSWORD = "13122002"

MANAGER_ID = 10              # <-- ID du manager déjà existant
MANAGER_EMAIL = "kawtartaik@gmail.com"
EMPLOYE_ID = 14            # <-- ID d'un employé existant (PAS un manager !)
EMPLOYE_EMAIL = "u2@gmail.com"
USER_PASSWORD = "13122002"
STATUS_VALUE = "active"

class UserEquipeTestUser(HttpUser):
    wait_time = between(1, 3)
    admin_token = None
    manager_token = None

    def on_start(self):
        # Connexion admin
        login_data = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        resp = self.client.post("/auth/login/", json=login_data)
        if resp.status_code == 200 and 'access' in resp.json():
            self.admin_token = resp.json()['access']
            print(f"[ADMIN LOGIN] Status: {resp.status_code}")
        else:
            print("[ADMIN LOGIN FAILED]", resp.status_code, resp.text)
            self.admin_token = None

        # Connexion manager (pour tester /equipes/membres/)
        login_manager = {"email": MANAGER_EMAIL, "password": USER_PASSWORD}
        resp = self.client.post("/auth/login/", json=login_manager)
        if resp.status_code == 200 and 'access' in resp.json():
            self.manager_token = resp.json()['access']
            print(f"[MANAGER LOGIN] Status: {resp.status_code}")
        else:
            print("[MANAGER LOGIN FAILED]", resp.status_code, resp.text)
            self.manager_token = None

    @task(2)
    def get_equipes(self):
        """Liste les équipes (admin)"""
        if self.admin_token:
            resp = self.client.get(
                "/gestion-utilisateurs/equipes/",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                name="/equipes"
            )
            print(f"[GET /equipes] Status: {resp.status_code}")
def get_active_employe_id(self):
    resp = self.client.get(
        "/gestion-utilisateurs/users/",
        headers={"Authorization": f"Bearer {self.admin_token}"}
    )
    if resp.status_code == 200:
        users = resp.json()
        employes = [u["id"] for u in users if u["role"] == "employe" and u["is_active"]]
        if employes:
            return random.choice(employes)
    return None

    @task(1)
    def create_equipe(self):
        if self.admin_token:
            employe_id = self.get_active_employe_id()
            if not employe_id:
                print("[NO ACTIVE EMPLOYE FOUND]")
                return
            data = {
                "nom": f"EquipeTest_{random.randint(100,999)}",
                "description": "test auto",
                "manager": MANAGER_ID,
                "membres": [employe_id],
                "status": "active"
            }
            resp = self.client.post(
                "/gestion-utilisateurs/equipes/",
                json=data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                name="/equipes"
            )
            print(f"[POST /equipes] Status: {resp.status_code}, Response: {resp.text}")


    @task(1)
    def list_users(self):
        """Liste tous les utilisateurs (admin)"""
        if self.admin_token:
            resp = self.client.get(
                "/gestion-utilisateurs/users/",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                name="/users"
            )
            print(f"[GET /users] Status: {resp.status_code}")

    @task(1)
    def update_user_role(self):
        """Change le rôle d'un employé existant (admin)"""
        if self.admin_token:
            data = {"role": "manager"}
            resp = self.client.patch(
                f"/gestion-utilisateurs/users/{EMPLOYE_ID}/role/",
                json=data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                name="/users/{id}/role"
            )
            print(f"[PATCH /users/{EMPLOYE_ID}/role/] Status: {resp.status_code}, Response: {resp.text}")

    @task(1)
    def equipes_membres(self):
        # GET /manager/mes-equipes/ (en tant que manager)
        if self.manager_token:
            resp = self.client.get(
                "/gestion-utilisateurs/manager/mes-equipes/",
                headers={"Authorization": f"Bearer {self.manager_token}"},
                name="/manager/mes-equipes"
            )
            print(f"[GET /manager/mes-equipes/] Status: {resp.status_code}")
