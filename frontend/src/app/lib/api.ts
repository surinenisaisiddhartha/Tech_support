'use client';

const BACKEND_URL = "http://127.0.0.1:8000";

export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file");
  }
  return await response.json();
};

export const askQuestion = async (query: string) => {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error("Failed to get answer");
  }
  return await response.json();
};



export const deleteFile = async (filename: string) => {
  const res = await fetch(`http://localhost:8000/delete/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete file');
  }

  return res.json();
};