from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from PIL import Image
import numpy as np
import io
import cv2
import pickle
from skimage.feature import hog

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open('./model/model.pkl', 'rb') as model_file:
    model = pickle.load(model_file)

with open('./model/scaler.pkl', 'rb') as scaler_file:
    scaler = pickle.load(scaler_file)


@app.get("/status")
async def get_status():
    return JSONResponse(content={"status": "Running"})

@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    try:
        image = Image.open(io.BytesIO(await file.read()))
        image_array = np.array(image.convert("L"))
        image_array = cv2.resize(image_array, (256, 256))
        features, _ = hog(image_array, pixels_per_cell=(16, 16), cells_per_block=(2, 2), visualize=True)
        features = features.reshape(1, -1)
        features = scaler.transform(features)
        probability = model.predict_proba(features)[0]
        return JSONResponse(content={"status": "Success", "probability": f"{probability[0] * 100:.2f}%"})
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
