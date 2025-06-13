
import os
from dotenv import load_dotenv
import openai

def main():
    load_dotenv()
    openai.api_key = os.getenv("OPENAI_API_KEY")

    resp = openai.Model.list()
    print("Available models:")
    for m in resp["data"]:
        print("-", m["id"])

if __name__ == "__main__":
    main()