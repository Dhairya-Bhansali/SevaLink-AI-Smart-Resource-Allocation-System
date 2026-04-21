import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

MODEL_PATH = "model.pkl"
ENCODERS_PATH = "encoders.pkl"

class PredictionEngine:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.encoders = {}
        
    def train(self, data: list):
        """
        Train the prediction engine using historical need data.
        data format: [{"location": "Surat", "season": "Monsoon", "urgency": "High", "people_affected": 500, "need_type": "Medical"}]
        """
        if not data:
            return None
        
        df = pd.DataFrame(data)
        
        # Preprocessing pipieline
        # Handle missing values
        df.fillna({"season": "Unknown", "location": "Unknown", "urgency": "Low"}, inplace=True)
        df["people_affected"] = pd.to_numeric(df["people_affected"], errors='coerce').fillna(0)
        
        # Target variable
        y = df["need_type"]
        X = df.drop(columns=["need_type"])

        # Identifing categorical columns and encoding
        categorical_cols = ["location", "season", "urgency"]
        self.encoders = {}
        
        for col in categorical_cols:
            le = LabelEncoder()
            # We add an 'Unknown' category to handle unseen labels during prediction
            X[col] = X[col].astype(str)
            le.fit(list(X[col].unique()) + ['<unknown>'])
            X[col] = le.transform(X[col])
            self.encoders[col] = le
            
        # Target Encoder
        target_encoder = LabelEncoder()
        y_encoded = target_encoder.fit_transform(y)
        self.encoders['target'] = target_encoder
        
        X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
        
        self.model.fit(X_train, y_train)
        
        predictions = self.model.predict(X_test)
        acc = accuracy_score(y_test, predictions)
        
        self.save_model()
        return acc

    def predict_future_needs(self, location: str, season: str, urgency: str, people_affected: int):
        self.load_model()
        
        # Create input df
        df = pd.DataFrame([{
            "location": location,
            "season": season,
            "urgency": urgency,
            "people_affected": people_affected
        }])
        
        # Apply encoding handling unknowns
        categorical_cols = ["location", "season", "urgency"]
        for col in categorical_cols:
            if col in self.encoders:
                le = self.encoders[col]
                # If unseen label, assign <unknown>
                df[col] = df[col].apply(lambda x: x if x in le.classes_ else '<unknown>')
                df[col] = le.transform(df[col])
                
        pred_encoded = self.model.predict(df)[0]
        prediction = self.encoders['target'].inverse_transform([pred_encoded])[0]
        
        # Return probability distribution
        probs = self.model.predict_proba(df)[0]
        confidence = max(probs)
        
        return {
            "predicted_need": prediction,
            "confidence": round(confidence * 100, 2),
            "location": location,
            "season": season
        }
        
    def save_model(self):
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.encoders, ENCODERS_PATH)

    def load_model(self):
        if os.path.exists(MODEL_PATH) and os.path.exists(ENCODERS_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.encoders = joblib.load(ENCODERS_PATH)
            return True
        return False

# Initialize a dummy model if doesn't exist to ensure the system is operational immediately
engine = PredictionEngine()
if not engine.load_model():
    dummy_data = [
        {"location": "Ahmedabad", "season": "Monsoon", "urgency": "High", "people_affected": 500, "need_type": "Medical"},
        {"location": "Surat", "season": "Monsoon", "urgency": "Critical", "people_affected": 1200, "need_type": "Water"},
        {"location": "Mumbai", "season": "Summer", "urgency": "Medium", "people_affected": 300, "need_type": "Food"},
        {"location": "Ahmedabad", "season": "Winter", "urgency": "Low", "people_affected": 50, "need_type": "Education"},
        {"location": "Pune", "season": "Monsoon", "urgency": "Critical", "people_affected": 800, "need_type": "Logistics"}
    ] * 10 # small multiplier to provide enough training samples for Random Forest
    engine.train(dummy_data)
