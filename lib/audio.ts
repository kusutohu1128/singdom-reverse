const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function reverseAudio(audioBlob: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'input.webm'); // Backend handles conversion or expects specific format? 
  // Our backend uses librosa which handles webm usually if ffmpeg is present.

  const response = await fetch(`${BACKEND_URL}/reverse`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${response.status} ${errorText}`);
  }

  return await response.blob();
}

export async function processAudio(audioBlob: Blob, effect: string): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'input.webm');
  formData.append('effect', effect);

  const response = await fetch(`${BACKEND_URL}/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Backend process error: ${response.status}`);
  }

  return await response.blob();
}
