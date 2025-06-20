import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Select,
  Button,
  Card,
  message,
  Table,
  Tag,
  Form,
  InputNumber,
  Modal,
  Typography,
  Divider,
  Space,
  Row,
  Col
} from 'antd';
import { EditOutlined, SettingOutlined, BookOutlined } from '@ant-design/icons';
import axios from 'axios';
import { Formule, Equipe } from '../../types';
const { Option } = Select;
const { Text, Title } = Typography;

interface RegleConge {
  id: number;
  equipe: number;
  formule_defaut: Formule;
  jours_ouvrables_annuels: number;
  jours_acquis_annuels: number;
  jours_conges_acquis?: number;
  date_mise_a_jour: string;
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month} - ${hours}:${minutes}`;
};

const TeamRulesConfig: React.FC = () => {
  const { user, logout } = useAuth();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null);
  const [regleEquipe, setRegleEquipe] = useState<RegleConge | null>(null);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
  });

  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        logout();
        message.error('Session expirée. Veuillez vous reconnecter.');
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const equipesResponse = await api.get('/gestion-utilisateurs/manager/mes-equipes/');
        setEquipes(equipesResponse.data);
        if (equipesResponse.data.length > 0) setSelectedEquipe(equipesResponse.data[0].id);
        const formulesResponse = await api.get('/gestion-absences-conges/formules/');
        setFormules(formulesResponse.data);
      } catch {
        message.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'manager') fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedEquipe) fetchRegleEquipe();
  }, [selectedEquipe]);

  const fetchRegleEquipe = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/gestion-absences-conges/regles-conge/?equipe=${selectedEquipe}`);
      if (response.data.length > 0) {
        setRegleEquipe(response.data[0]);
        form.setFieldsValue({
          ...response.data[0],
          formule_defaut: response.data[0].formule_defaut?.id,
          jours_travailles: response.data[0].jours_travailles ?? 230,
          nb_feries: response.data[0].nb_feries ?? 10
        });
      } else {
        setRegleEquipe(null);
        form.resetFields();
      }
    } catch {
      message.error('Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedEquipe) {
        message.error("Veuillez sélectionner une équipe.");
        return;
      }
      const data = {
        equipe: selectedEquipe,
        ...values
      };

      if (regleEquipe) {
        await api.put(`/gestion-absences-conges/regles-conge/${regleEquipe.id}/`, data);
        message.success('Règles mises à jour avec succès');
      } else {
        await api.post('/gestion-absences-conges/regles-conge/', data);
        message.success('Règles créées avec succès');
      }

      setIsModalVisible(false);
      fetchRegleEquipe();
    } catch {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const columns = [
    {
      title: 'Formule',
      key: 'formule',
      render: (_: any, record: RegleConge) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingOutlined style={{ color: '#8B4513' }} />
          <Text strong style={{ color: '#5D4037' }}>
            {record.formule_defaut ? record.formule_defaut.nom_formule : '—'}
          </Text>
        </div>
      )
    },
    {
      title: 'Jours ouvrables annuels',
      dataIndex: 'jours_ouvrables_annuels',
      key: 'jours_ouvrables_annuels',
      render: (jours: number) => (
        <Tag 
          style={{ 
            backgroundColor: '#FEFCF8', 
            color: '#8B4513', 
            border: '1px solid #E8D5C4',
            borderRadius: '8px',
            fontWeight: '600'
          }}
        >
          {jours} jours
        </Tag>
      )
    },
    {
      title: 'Jours acquis annuels',
      dataIndex: 'jours_acquis_annuels',
      key: 'jours_acquis_annuels',
      render: (jours: number) => (
        <Tag 
          style={{ 
            backgroundColor: '#FFFFFF', 
            color: '#8B4513', 
            border: '1px solid #D2B48C',
            borderRadius: '8px',
            fontWeight: '600'
          }}
        >
          {jours} jours
        </Tag>
      )
    },
    {
      title: 'Jours de congés acquis (calculés)',
      dataIndex: 'jours_conges_acquis',
      key: 'jours_conges_acquis',
      render: (jours?: number) =>
        jours !== undefined && jours !== null ? (
          <Tag 
            style={{ 
              backgroundColor: '#FFFFFF', 
              color: '#8B4513', 
              border: '1px solid #C19A6B',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            {Math.round(jours)} jours
          </Tag>
        ) : (
          <Tag 
            style={{ 
              backgroundColor: '#FEFCF8', 
              color: '#A0826D', 
              border: '1px solid #E8D5C4',
              borderRadius: '8px'
            }}
          >
            Non calculé
          </Tag>
        )
    },
    {
      title: 'Dernière mise à jour',
      dataIndex: 'date_mise_a_jour',
      key: 'date_mise_a_jour',
      render: (dateStr: string) => (
        <Text style={{ color: '#8B4513', fontSize: '13px' }}>
          {formatDate(dateStr)}
        </Text>
      )
    }
  ];

  const customStyles = `
    .team-rules-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #FEFCF8 0%, #F8F6F2 100%);
      padding: 24px;
    }
    
    .main-card {
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(139, 69, 19, 0.08);
      border: 1px solid #F0E8DC;
    }
    
    .main-card .ant-card-head {
      background: linear-gradient(135deg, #F5E6D3 0%, #E8D5C4 100%);
      border-radius: 16px 16px 0 0;
      border-bottom: 1px solid #E0D0C4;
    }
    
    .main-card .ant-card-head-title {
      color: #8B4513 !important;
      font-weight: 600;
      font-size: 18px;
    }
    
    .main-card .ant-card-extra .ant-btn-primary {
      background: linear-gradient(135deg, #D2B48C 0%, #DDD0C8 100%);
      border: 1px solid #C19A6B;
      color: #5D4037;
      font-weight: 600;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(139, 69, 19, 0.15);
    }
    
    .main-card .ant-card-extra .ant-btn-primary:hover {
      background: linear-gradient(135deg, #C19A6B 0%, #D2B48C 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
    }
    
    .team-select {
      background: #FFF;
      border: 2px solid #E8D5C4;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(139, 69, 19, 0.06);
    }
    
    .team-select:hover {
      border-color: #D2B48C;
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
    }
    
    .team-select .ant-select-selector {
      border: none !important;
      box-shadow: none !important;
      background: transparent;
      font-weight: 500;
      color: #5D4037;
    }
    
    .formules-card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #F0E8DC;
      box-shadow: 0 3px 16px rgba(139, 69, 19, 0.06);
    }
    
    .formules-card .ant-card-head {
      background: linear-gradient(135deg, #FEFCF8 0%, #F8F6F2 100%);
      border-radius: 16px 16px 0 0;
      border-bottom: 1px solid #E8D5C4;
    }
    
    .formules-card .ant-card-head-title {
      color: #8B4513 !important;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .formule-item {
      background: #FEFCF8;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #F0E8DC;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }
    
    .formule-item:hover {
      box-shadow: 0 4px 16px rgba(139, 69, 19, 0.08);
      transform: translateY(-2px);
      border-color: #E8D5C4;
      background: #FFFFFF;
    }
    
    .ant-table {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(139, 69, 19, 0.06);
      background: #FFFFFF;
    }
    
    .ant-table-thead > tr > th {
      background: linear-gradient(135deg, #FEFCF8 0%, #F8F6F2 100%);
      color: #8B4513 !important;
      font-weight: 600;
      border-bottom: 1px solid #E8D5C4;
    }
    
    .ant-table-tbody > tr > td {
      border-bottom: 1px solid #F5F5F5;
      background: #FFFFFF;
    }
    
    .ant-table-tbody > tr:hover > td {
      background: #FEFCF8 !important;
    }
    
    .custom-modal .ant-modal-header {
      background: linear-gradient(135deg, #F5E6D3 0%, #E8D5C4 100%);
      border-radius: 8px 8px 0 0;
    }
    
    .custom-modal .ant-modal-title {
      color: #8B4513 !important;
      font-weight: 600;
    }
    
    .custom-modal .ant-form-item-label > label {
      color: #5D4037;
      font-weight: 600;
    }
    
    .custom-modal .ant-input-number,
    .custom-modal .ant-select-selector {
      border: 2px solid #F0E8DC;
      border-radius: 8px;
      background: #FEFCF8;
    }
    
    .custom-modal .ant-input-number:hover,
    .custom-modal .ant-select:hover .ant-select-selector {
      border-color: #E8D5C4;
      background: #FFFFFF;
    }
    
    .custom-modal .ant-input-number:focus,
    .custom-modal .ant-select-focused .ant-select-selector {
      border-color: #D2B48C !important;
      box-shadow: 0 0 0 2px rgba(210, 180, 140, 0.2) !important;
      background: #FFFFFF;
    }
    
    .no-rules-message {
      text-align: center;
      padding: 40px;
      background: #FEFCF8;
      border-radius: 12px;
      border: 2px dashed #E8D5C4;
      color: #A0826D;
      font-size: 16px;
      font-weight: 500;
    }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <div className="team-rules-container">
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              className="main-card"
              title={
                <Space>
                  <SettingOutlined />
                  Configuration des règles de congé
                </Space>
              }
              loading={loading}
              extra={
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsModalVisible(true)}
                  disabled={!selectedEquipe}
                  size="large"
                >
                  Modifier les règles
                </Button>
              }
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ color: '#5D4037', marginBottom: '8px', display: 'block' }}>
                    Sélectionner une équipe
                  </Text>
                  <Select
                    className="team-select"
                    style={{ width: '100%', maxWidth: 400 }}
                    value={selectedEquipe}
                    onChange={setSelectedEquipe}
                    placeholder="Choisissez une équipe à configurer"
                    size="large"
                  >
                    {equipes.map(equipe => (
                      <Option key={equipe.id} value={equipe.id}>
                        {equipe.nom}
                      </Option>
                    ))}
                  </Select>
                </div>

                {regleEquipe ? (
                  <Table
                    columns={columns}
                    dataSource={[regleEquipe]}
                    rowKey="id"
                    pagination={false}
                    size="large"
                  />
                ) : (
                  <div className="no-rules-message">
                    <SettingOutlined style={{ fontSize: '32px', marginBottom: '16px', display: 'block' }} />
                    Aucune règle définie pour cette équipe
                    <br />
                    <Text type="secondary">Cliquez sur "Modifier les règles" pour commencer la configuration</Text>
                  </div>
                )}
              </Space>
            </Card>
          </Col>

          <Col span={24}>
            <Card 
              className="formules-card"
              title={
                <Space>
                  <BookOutlined style={{ color: '#8B4513' }} />
                  Autres formules disponibles
                </Space>
              }
              type="inner"
            >
              <Row gutter={[16, 16]}>
                {formules.map(formule => (
                  <Col xs={24} md={12} lg={8} key={formule.id}>
                    <div className="formule-item">
                      <Title level={5} style={{ color: '#8B4513', marginBottom: '8px' }}>
                        {formule.nom_formule}
                      </Title>
                      <Text 
                        code 
                        style={{ 
                          backgroundColor: '#FFFFFF', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          color: '#8B4513',
                          border: '1px solid #E8D5C4',
                          fontFamily: 'monospace',
                          fontSize: '13px'
                        }}
                      >
                        {formule.expression}
                      </Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>

        <Modal
          title={
            <Space>
              <EditOutlined />
              Modifier les règles de congé
            </Space>
          }
          open={isModalVisible}
          onOk={handleSave}
          onCancel={() => setIsModalVisible(false)}
          width={700}
          destroyOnClose
          className="custom-modal"
          okText="Sauvegarder"
          cancelText="Annuler"
          okButtonProps={{
            style: {
              background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }
          }}
          cancelButtonProps={{
            style: {
              borderColor: '#D2B48C',
              color: '#8B4513',
              borderRadius: '8px',
              fontWeight: '600'
            }
          }}
        >
          <Form 
            form={form} 
            layout="vertical" 
            initialValues={{ jours_travailles: 230, nb_feries: 10 }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Formule de calcul"
                  name="formule_defaut"
                  rules={[{ required: true, message: 'Ce champ est requis' }]}
                >
                  <Select placeholder="Sélectionner une formule" size="large">
                    {formules.map(formule => (
                      <Option key={formule.id} value={formule.id}>
                        {formule.nom_formule}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Jours de congé acquis annuellement"
                  name="jours_acquis_annuels"
                  rules={[{ required: true, message: 'Ce champ est requis' }]}
                >
                  <InputNumber 
                    min={1} 
                    max={365} 
                    style={{ width: '100%' }} 
                    size="large"
                    placeholder="Ex: 25"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Jours travaillés"
                  name="jours_travailles"
                  rules={[{ required: true, message: 'Ce champ est requis' }]}
                >
                  <InputNumber 
                    min={0} 
                    max={365} 
                    style={{ width: '100%' }} 
                    size="large"
                    placeholder="Ex: 230"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Nombre de jours fériés"
                  name="nb_feries"
                  rules={[{ required: true, message: 'Ce champ est requis' }]}
                >
                  <InputNumber 
                    min={0} 
                    max={50} 
                    style={{ width: '100%' }} 
                    size="large"
                    placeholder="Ex: 10"
                  />
                </Form.Item>
              </Col>

              {regleEquipe && (
                <>
                  <Col xs={24} md={12}>
                    <Form.Item label="Jours ouvrables annuels (calculé)">
                      <InputNumber
                        value={regleEquipe.jours_ouvrables_annuels}
                        disabled
                        style={{ width: '100%' }}
                        size="large"
                      />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item label="Jours de congés acquis (calculés)">
                      <InputNumber
                        value={regleEquipe.jours_conges_acquis}
                        disabled
                        style={{ width: '100%' }}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </Form>
        </Modal>
      </div>
    </>
  );
};

export default TeamRulesConfig;