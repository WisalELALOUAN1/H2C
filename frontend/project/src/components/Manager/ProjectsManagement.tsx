import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchProjects, createProject, fetchEquipesDisponibles } from '../../services/api';
import { Projet, Equipe, ProjetFormData, User } from '../../types';

interface RawProjet extends Omit<Projet, 'equipe'> {
    equipe_num: number;
    equipe_nom: string;
    manager_equipe?: {
        id: number;
        nom: string;
        prenom: string;
    } | null;
}

const ProjectsManagement: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Projet[]>([]);
    const [equipes, setEquipes] = useState<Equipe[]>([]);
    const [loading, setLoading] = useState({ projects: true, equipes: true });
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState<ProjetFormData>({
        nom: '',
        description: '',
        date_debut: '',
        date_fin: '',
        taux_horaire: 0,
        categorie: 'interne',
        equipe: null
    });

    const createUserFromManager = (manager?: { id: number; nom: string; prenom: string } | null): User | null => {
        if (!manager) return null;
        
        return {
            id: manager.id,
            nom: manager.nom,
            prenom: manager.prenom,
            email: `${manager.prenom.toLowerCase()}.${manager.nom.toLowerCase()}@entreprise.com`,
            role: 'manager',
            username: `${manager.prenom.toLowerCase()}.${manager.nom.toLowerCase()}`,
            date_joined: new Date().toISOString(),
            is_active: true
        };
    };

    const transformProjet = (rawProjet: RawProjet): Projet => {
        return {
            ...rawProjet,
            equipe: {
                id: rawProjet.equipe_num,
                nom: rawProjet.equipe_nom,
                description: '',
                manager: createUserFromManager(rawProjet.manager_equipe),
                membres: [],
                status: 'actif',
                date_creation: new Date().toISOString()
            }
        };
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [projectsResponse, equipesResponse] = await Promise.all([
                    fetchProjects(),
                    fetchEquipesDisponibles()
                ]);
                
                const projectsData = projectsResponse as unknown as RawProjet[];
                const equipesData = equipesResponse as Equipe[];
                
                const transformedProjects = projectsData.map(transformProjet);
                
                setProjects(transformedProjects);
                setEquipes(equipesData);
                
                if (user?.role === 'employe') {
                    const equipeEmploye = equipesData.find(e => 
                        e.membres?.some(m => m.id === user.id)
                    );
                    if (equipeEmploye) {
                        setFormData(prev => ({ 
                            ...prev, 
                            equipe: equipeEmploye.id 
                        }));
                    }
                }
            } catch (err) {
                setError('Erreur lors du chargement des données');
                console.error(err);
            } finally {
                setLoading({ projects: false, equipes: false });
            }
        };
        loadData();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'taux_horaire' 
                ? parseFloat(value) 
                : name === 'equipe'
                    ? value ? parseInt(value, 10) : null
                    : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        try {
            if (!user || (user.role !== 'admin' && user.role !== 'manager' && !formData.equipe)) {
                throw new Error('Aucune équipe disponible pour affectation');
            }

            const projectData = {
                ...formData,
                equipe: user.role === 'employe' 
                    ? equipes.find(e => e.membres?.some(m => m.id === user.id))?.id || null
                    : formData.equipe
            };

            const newProject = await createProject(projectData);
            const transformedProject = transformProjet(newProject as unknown as RawProjet);
            
            setProjects(prev => [...prev, transformedProject]);
            
            setFormData({
                nom: '',
                description: '',
                date_debut: '',
                date_fin: '',
                taux_horaire: 0,
                categorie: 'interne',
                equipe: user.role === 'employe' 
                    ? equipes.find(e => e.membres?.some(m => m.id === user.id))?.id || null
                    : null
            });

            setShowForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la création du projet');
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'interne': return '🏢';
            case 'client': return '🤝';
            case 'r&d': return '🔬';
            default: return '📋';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'interne': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'client': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'r&d': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-stone-100 text-stone-800 border-stone-200';
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'interne': return 'Projet Interne';
            case 'client': return 'Projet Client';
            case 'r&d': return 'Recherche & Développement';
            default: return category;
        }
    };

    if (loading.projects || loading.equipes) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 flex justify-center items-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mx-auto mb-4"></div>
                        <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-orange-400 animate-pulse"></div>
                    </div>
                    <p className="text-stone-600 font-medium">Chargement des projets...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl mb-6 shadow-lg">
                        <span className="text-2xl">🚀</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 via-orange-700 to-yellow-700 bg-clip-text text-transparent mb-3">
                        Gestion des Projets
                    </h1>
                    <p className="text-stone-600 text-lg">Créez et gérez vos projets avec style</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-red-500 text-xl">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                            <button 
                                onClick={() => setError(null)}
                                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out"
                    >
                        <span className="mr-3 text-xl group-hover:animate-bounce">
                            {showForm ? '📋' : '➕'}
                        </span>
                        {showForm ? 'Masquer le formulaire' : 'Créer un nouveau projet'}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform animate-in slide-in-from-top duration-500">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6">
                            <h3 className="text-2xl font-bold text-white flex items-center">
                                <span className="mr-3">✨</span>
                                Nouveau Projet
                            </h3>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="nom" className="block text-sm font-medium text-stone-700 mb-1">
                                        Nom du projet <span className="text-amber-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nom"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                        placeholder="Mon super projet"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="categorie" className="block text-sm font-medium text-stone-700 mb-1">
                                        Catégorie <span className="text-amber-600">*</span>
                                    </label>
                                    <select
                                        id="categorie"
                                        name="categorie"
                                        value={formData.categorie}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                    >
                                        <option value="interne">Interne</option>
                                        <option value="client">Client</option>
                                        <option value="r&d">R&D</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                    placeholder="Décrivez les objectifs du projet..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="date_debut" className="block text-sm font-medium text-stone-700 mb-1">
                                        Date de début <span className="text-amber-600">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="date_debut"
                                        name="date_debut"
                                        value={formData.date_debut}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="date_fin" className="block text-sm font-medium text-stone-700 mb-1">
                                        Date de fin prévue
                                    </label>
                                    <input
                                        type="date"
                                        id="date_fin"
                                        name="date_fin"
                                        value={formData.date_fin}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="taux_horaire" className="block text-sm font-medium text-stone-700 mb-1">
                                        Coût horaire (€) <span className="text-amber-600">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="taux_horaire"
                                        name="taux_horaire"
                                        value={formData.taux_horaire}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                        placeholder="50.00"
                                    />
                                </div>

                                {(user?.role === 'admin' || user?.role === 'manager') && (
                                    <div>
                                        <label htmlFor="equipe" className="block text-sm font-medium text-stone-700 mb-1">
                                            Équipe assignée
                                        </label>
                                        <select
                                            id="equipe"
                                            name="equipe"
                                            value={formData.equipe || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                        >
                                            <option value="">-- Sélectionnez une équipe --</option>
                                            {equipes.map(equipe => (
                                                <option key={equipe.id} value={equipe.id}>
                                                    {equipe.nom} {equipe.manager && `(Manager: ${equipe.manager.prenom} ${equipe.manager.nom})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-3 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                                >
                                    Créer le projet
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-stone-700 to-stone-800 p-6">
                        <h3 className="text-2xl font-bold text-white flex items-center">
                            <span className="mr-3">📊</span>
                            Projets Existants
                            <span className="ml-auto bg-white/20 px-4 py-2 rounded-full text-sm">
                                {projects.length} projet{projects.length !== 1 ? 's' : ''}
                            </span>
                        </h3>
                    </div>
                    
                    {projects.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-stone-500 text-lg font-medium">Aucun projet disponible</p>
                            <p className="text-stone-400 mt-2">Commencez par créer votre premier projet !</p>
                        </div>
                    ) : (
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {projects.map((project, index) => (
                                    <div 
                                        key={project.id}
                                        className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-stone-200 hover:border-amber-300 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                                        style={{
                                            animationDelay: `${index * 100}ms`,
                                            animation: 'fadeInUp 0.6s ease-out forwards'
                                        }}
                                    >
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <h4 className="font-bold text-xl text-stone-800 group-hover:text-amber-600 transition-colors line-clamp-2">
                                                    {project.nom}
                                                </h4>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(project.categorie)}`}>
                                                    {getCategoryIcon(project.categorie)} {getCategoryLabel(project.categorie)}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center text-stone-600">
                                                    <span className="mr-2">👥</span>
                                                    <span className="font-medium">
                                                        {project.equipe?.nom || 'Non affecté'}
                                                        {project.equipe?.manager && (
                                                            <span className="block text-xs text-stone-400">
                                                                Manager: {project.equipe.manager.prenom} {project.equipe.manager.nom}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center text-stone-600">
                                                    <span className="mr-2">📅</span>
                                                    <span>
                                                        {new Date(project.date_debut).toLocaleDateString('fr-FR')} - {new Date(project.date_fin).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center text-stone-600">
                                                    <span className="mr-2">⏱️</span>
                                                    <span className="font-bold text-orange-600">{project.taux_horaire} h</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-amber-50 px-6 py-4 border-t border-amber-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-stone-500">Projet #{project.id}</span>
                                                
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>
                {`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                `}
            </style>
        </div>
    );
};

export default ProjectsManagement;