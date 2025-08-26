'use client';

const BACKEND_URL = "https://tech-support-backend.onrender.com";

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
  const res = await fetch(`${BACKEND_URL}/delete/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete file');
  }

  return res.json();
};