import os
import cv2
import numpy as np
import pickle
from sklearn.model_selection import GridSearchCV
from sklearn.svm import SVC
from sklearn.metrics import classification_report
from sklearn.preprocessing import StandardScaler
from skimage.feature import hog

def load_images_from_folder(folder, label, use_hog=False):
    images = []
    labels = []
    for file_name in os.listdir(folder):
        if file_name.endswith(".png"):
            img_path = os.path.join(folder, file_name)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            img = cv2.resize(img, (256, 256))
            if use_hog:
                features, _ = hog(img, pixels_per_cell=(16, 16), cells_per_block=(2, 2), visualize=True)
                images.append(features)
            else:
                images.append(img.flatten())
            labels.append(label)
    return np.array(images), np.array(labels)

def loadFolderPaths():
    return "./cognitive_healthy", "./cognitive_problems", "./cognitive_healthy_test", "./cognitive_problems_test"

cognitive_healthy, cognitive_problems, cognitive_healthy_test, cognitive_problems_test = loadFolderPaths()

X_train_healthy, y_train_healthy = load_images_from_folder(cognitive_healthy, 0, use_hog=True)
X_train_problems, y_train_problems = load_images_from_folder(cognitive_problems, 1, use_hog=True)

X_test_healthy, y_test_healthy = load_images_from_folder(cognitive_healthy_test, 0, use_hog=True)
X_test_problems, y_test_problems = load_images_from_folder(cognitive_problems_test, 1, use_hog=True)

X_train = np.concatenate((X_train_healthy, X_train_problems), axis=0)
y_train = np.concatenate((y_train_healthy, y_train_problems), axis=0)

X_test = np.concatenate((X_test_healthy, X_test_problems), axis=0)
y_test = np.concatenate((y_test_healthy, y_test_problems), axis=0)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

param_grid = {
    'C': [0.1, 1, 10, 100],
    'gamma': ['scale', 'auto'],
    'kernel': ['linear', 'rbf', 'poly', 'sigmoid'],
    'degree': [2, 3, 4]
}

svm_model = SVC(probability=True)

grid_search = GridSearchCV(svm_model, param_grid, cv=5, verbose=2, n_jobs=-1)
grid_search.fit(X_train, y_train)

best_svm_model = grid_search.best_estimator_

y_pred_svm = best_svm_model.predict(X_test)

print(classification_report(y_test, y_pred_svm))

directory_path = '../backend/model/'
os.makedirs(directory_path, exist_ok=True)

with open(os.path.join(directory_path, 'model.pkl'), 'wb') as model_file:
    pickle.dump(best_svm_model, model_file)

with open(os.path.join(directory_path, 'scaler.pkl'), 'wb') as scaler_file:
    pickle.dump(scaler, scaler_file)

