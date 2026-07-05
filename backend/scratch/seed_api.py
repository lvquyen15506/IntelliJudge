import json
import os
import sys
import requests

def seed_data():
    base_url = "http://localhost:8000/api/v1"
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    problems_json_path = os.path.abspath(os.path.join(current_dir, "..", "..", "problems.json"))
    
    if not os.path.exists(problems_json_path):
        print(f"[Error] Seed data file not found at: {problems_json_path}")
        sys.exit(1)
        
    print(f"Reading seed data file from: {problems_json_path}")
    with open(problems_json_path, "r", encoding="utf-8") as f:
        problems = json.load(f)
        
    print(f"Found {len(problems)} problems to seed.")

    token = None
    
    credentials_list = [
        {"username": "admin_root", "password": "IntelliJudge@123"},
        {"username": "admin", "password": "admin123"} 
    ]
    
    for creds in credentials_list:
        print(f"Trying login with username: '{creds['username']}'...")
        try:
            response = requests.post(
                f"{base_url}/auth/login",
                data=creds,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            if response.status_code == 200:
                token = response.json().get("access_token")
                print(f"Login successful for '{creds['username']}'!")
                break
            else:
                print(f"Login failed for '{creds['username']}': {response.status_code}")
        except Exception as e:
            print(f"Login connection error: {repr(e)}")

    if not token:
        print("[Error] Could not login as admin. Make sure the FastAPI server is running on port 8000.")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for idx, prob in enumerate(problems, 1):
        print(f"\n[{idx}/{len(problems)}] Seeding problem index {idx}...")
        
        problem_payload = {
            "title": prob["title"],
            "description": prob["description"],
            "time_limit": float(prob["time_limit"]),
            "memory_limit": float(prob["memory_limit"]),
            "tags": prob["tags"]
        }
        
        try:
            prob_res = requests.post(f"{base_url}/problems/", json=problem_payload, headers=headers, timeout=10)
            if prob_res.status_code not in (200, 201):
                print(f"Failed to create problem index {idx}: {prob_res.status_code}")
                continue
                
            problem_id = prob_res.json().get("id")
            print(f"Problem created successfully! ID: {problem_id}")
            
            test_cases = prob.get("test_cases", [])
            tc_success_count = 0
            
            for tc_idx, tc in enumerate(test_cases, 1):
                tc_payload = {
                    "input_data": tc["input_data"],
                    "output_data": tc["expected_output"],
                    "is_hidden": tc["is_hidden"]
                }
                tc_res = requests.post(
                    f"{base_url}/problems/{problem_id}/testcases", 
                    json=tc_payload, 
                    headers=headers, 
                    timeout=10
                )
                if tc_res.status_code in (200, 201):
                    tc_success_count += 1
                else:
                    print(f"Failed to insert testcase #{tc_idx} for problem {problem_id}: {tc_res.status_code}")
                    
            print(f"Inserted {tc_success_count}/{len(test_cases)} test cases.")
            
        except Exception as e:
            print(f"Error processing problem index {idx}: {repr(e)}")

    print("\nSeeding complete!")

if __name__ == "__main__":
    seed_data()
