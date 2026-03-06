import requests
import time

def run_test():
    base_url = "http://localhost:5000/api"
    session_id = "test-session-123"
    
    print("1. Creating dummy text file...")
    with open("dummy.txt", "w") as f:
        f.write("The secret code to the lab is 9942. The lab is located in the basement.")
        
    print("2. Uploading file to Node Express API...")
    with open("dummy.txt", "rb") as f:
        files = {'files': ('dummy.txt', f, 'text/plain')}
        data = {'session_id': session_id}
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
    print("Upload Response:", response.status_code, response.text)
    time.sleep(2)
    
    print("3. Asking a question...")
    payload = {
        "session_id": session_id,
        "question": "What is the secret code to the lab?"
    }
    response = requests.post(f"{base_url}/ask", json=payload)
    print("Ask Response:", response.status_code, response.text)
    
    print("4. Asking an out of context question...")
    payload2 = {
        "session_id": session_id,
        "question": "What is the recipe for chocolate cake?"
    }
    response2 = requests.post(f"{base_url}/ask", json=payload2)
    print("Out of context Response:", response2.status_code, response2.text)
    
    print("5. Clearing session...")
    response3 = requests.post(f"{base_url}/clear", json={"session_id": session_id})
    print("Clear Response:", response3.status_code, response3.text)

if __name__ == "__main__":
    run_test()
