import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { Upload, Button, message, Image, Radio, Space, Typography, Alert } from 'antd';
import { UploadOutlined, HighlightOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';
import CanvasDraw from 'react-canvas-draw';

const { Title } = Typography;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [probability, setProbability] = useState<number | null>(null);
  const [mode, setMode] = useState<'upload' | 'draw'>('upload');
  const [displayedProbability, setDisplayedProbability] = useState<number>(0);
  const canvasRef = useRef<typeof CanvasDraw | null>(null);

  const getProbabilityColor = (value: number) => {
    if (value <= 40) return '#28a745'; 
    if (value <= 70) return '#ffc107'; 
    return '#dc3545';
  };


  useEffect(() => {
    if (probability !== null && !isNaN(probability)) {
      let start = 0;
      const duration = 1500; 
      const increment = Math.ceil(probability / (duration / 30)); 
      const timer = setInterval(() => {
        start += increment;
        if (start >= probability) {
          setDisplayedProbability(probability);
          clearInterval(timer);
        } else {
          setDisplayedProbability(start);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [probability]);

  const handleUpload = (info: any) => {
    const file = info.file;

    if (!file) {
      message.error('Falha no upload da imagem. Tente novamente.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Só são permitidas imagens!');
      return;
    }

    setFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    let formData = new FormData();

    if (mode === 'upload') {
      if (!file) {
        message.error('Por favor selecione uma imagem antes de fazer a previsão!');
        return;
      }
      formData.append('file', file);
    } else if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) {
        message.error('Termine o desenho antes de fazer a previsão!');
        return;
      }

      const dataUrl = canvas.getDataURL();
      const blob = await (await fetch(dataUrl)).blob();
      formData.append('file', blob, 'desenho.png');
    }

    try {
      const response = await axios.post('http://localhost:8000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const rawProbability = response.data.probability; 
      const cleanedProbability = parseFloat(rawProbability.replace('%', ''));
      
      if (!isNaN(cleanedProbability)) {
        message.success('A imagem foi processada corretamente!');
        setProbability(cleanedProbability);
      } else {
        message.error('Erro ao processar a probabilidade.');
      }

    } catch (error) {
      message.error('Falha ao processar imagem!');
      console.error('Erro:', error);
    }
  };

  const clearCanvas = () => {
    canvasRef.current?.clear();
  };

  const undoStroke = () => {
    canvasRef.current?.undo();
  };

  return (
    <div style={styles.container}>
      <Title style={styles.title}>Detecção de Transtornos Cognitivos</Title>

      <Radio.Group
        onChange={(e) => setMode(e.target.value)}
        value={mode}
        style={styles.radioGroup}
      >
        <Radio.Button value="upload" style={styles.radioButton}>
          <UploadOutlined /> Selecionar uma imagem
        </Radio.Button>
        <Radio.Button value="draw" style={styles.radioButton}>
          <HighlightOutlined /> Desenhar uma imagem
        </Radio.Button>
      </Radio.Group>

      <div style={styles.mainContent}>
        {mode === 'draw' && (
          <div style={styles.canvasContainer}>
            <CanvasDraw
              ref={canvasRef}
              brushRadius={2}
              brushColor="blue"
              canvasWidth={500}
              canvasHeight={400}
              style={styles.canvas}
            />
            <Space style={styles.canvasButtons}>
              <Button onClick={clearCanvas} icon={<ClearOutlined />} style={styles.clearButton}>
                Limpar
              </Button>
              <Button onClick={undoStroke} icon={<HighlightOutlined />} style={styles.undoButton}>
                Voltar
              </Button>
            </Space>
          </div>
        )}

        {imageUrl && mode === 'upload' && (
          <div style={styles.imageContainer}>
            <Image
              src={imageUrl}
              alt="Selected Image"
              style={styles.imagePreview}
            />
          </div>
        )}

        <div style={styles.sidePanel}>
          {probability !== null && (
            <div style={styles.probabilityContainer}>
              <p
                style={{
                  ...styles.probabilityText,
                  color: getProbabilityColor(displayedProbability),
                }}
              >
                {displayedProbability.toFixed(2)}%
              </p>
            </div>
          )}

          {probability !== null && (
            <div style={styles.infoBox}>
              <Alert
                message="Níveis de Risco"
                description={
                  <div>
                    <p><b>0 - 40%</b>: Tudo está bem.</p>
                    <p><b>41 - 70%</b>: Atenção necessária.</p>
                    <p><b>71 - 100%</b>: Alto risco.</p>
                  </div>
                }
                type="info"
                showIcon
              />
            </div>
          )}
        </div>
      </div>

      {mode === 'upload' && (
        <Upload
          beforeUpload={() => false}
          onChange={handleUpload}
          accept="image/*"
          showUploadList={false}
          style={styles.uploadContainer}
        >
          <Button icon={<UploadOutlined />} style={styles.uploadButton}>
            Selecione a imagem
          </Button>
        </Upload>
      )}

      <Button
        type="primary"
        onClick={handleSubmit}
        style={styles.submitButton}
      >
        Previsão
      </Button>
    </div>
  );
};

const styles: { [key: string]: CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f0f2f5',
    minHeight: '100vh',
  },
  title: {
    color: '#4A90E2',
    fontSize: '24px',
    textAlign: 'center',
  },
  radioGroup: {
    marginBottom: '20px',
  },
  radioButton: {
    fontWeight: 'bold',
    fontSize: '16px',
  },
  uploadContainer: {
    marginBottom: '20px',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    borderRadius: '5px',
    marginTop: '20px',
  },
  canvasContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  canvas: {
    border: '2px solid #4A90E2',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  canvasButtons: {
    marginTop: '10px',
  },
  clearButton: {
    backgroundColor: '#FF4D4F',
    color: 'white',
    borderRadius: '5px',
  },
  undoButton: {
    backgroundColor: '#FFC107',
    color: 'white',
    borderRadius: '5px',
  },
  imageContainer: {
    marginTop: '20px',
  },
  imagePreview: {
    maxWidth: '300px',
    maxHeight: '300px',
    marginRight: '20px',
  },
  mainContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '30px',
  },
  sidePanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  probabilityContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '50px',
    fontWeight: 'bold',
  },
  probabilityText: {
    fontSize: '50px',
    margin: '0',
  },
  infoBox: {
    marginTop: '20px',
    width: '250px',
  },
  submitButton: {
    marginTop: '20px',
    backgroundColor: '#1890ff',
    color: 'white',
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '5px',
  },
};

export default App;
