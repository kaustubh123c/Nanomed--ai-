import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders import TextLoader


def load_documents(folder_path):

    documents = []

    for root, _, files in os.walk(folder_path):

        for file in files:

            path = os.path.join(root, file)

            print(f"Loading: {path}")

            try:

                if file.endswith(".pdf"):

                    loader = PyPDFLoader(path)
                    documents.extend(loader.load())

                elif file.endswith(".md") or file.endswith(".txt"):

                    loader = TextLoader(path, encoding="utf-8")
                    documents.extend(loader.load())

            except Exception as e:

                print(f"❌ Error loading {file}")
                print(e)
                print("-" * 50)

    return documents