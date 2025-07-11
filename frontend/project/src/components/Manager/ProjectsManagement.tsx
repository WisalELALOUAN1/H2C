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
            case 'interne': return 'bg-stone-50 text-stone-700 border-stone-200';
            case 'client': return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'r&d': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
            default: return 'bg-stone-50 text-stone-700 border-stone-200';
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
            <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50 flex justify-center items-center">
                <div className="text-center">
                    <div className="relative mb-8">
                        <div className="w-16 h-16 border-4 border-stone-200 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-stone-600 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-stone-800 font-semibold text-lg">Chargement en cours...</p>
                        <p className="text-stone-600 text-sm">Préparation de vos projets</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-6 border border-stone-200">
                        <span className="text-3xl">📊</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-4">
                        Gestion des Projets
                    </h1>
                    <p className="text-stone-600 text-lg max-w-2xl mx-auto leading-relaxed">
                        Organisez et suivez vos projets avec une interface moderne et intuitive
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-600 text-lg">⚠️</span>
                                </div>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-red-800 font-medium">{error}</p>
                            </div>
                            <button 
                                onClick={() => setError(null)}
                                className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Create Project Button */}
                <div className="text-center mb-12">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-stone-700 to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-stone-800 hover:to-amber-800"
                    >
                        <span className="mr-3 text-xl transition-transform duration-300 group-hover:rotate-12">
                            {showForm ? '📝' : '✨'}
                        </span>
                        <span className="text-lg">
                            {showForm ? 'Masquer le formulaire' : 'Créer un nouveau projet'}
                        </span>
                    </button>
                </div>

                {/* Project Form */}
                {showForm && (
                    <div className="mb-12 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-fade-in">
                        <div className="bg-gradient-to-r from-stone-700 to-amber-700 px-8 py-6">
                            <h3 className="text-2xl font-bold text-white flex items-center">
                                <span className="mr-3 text-3xl">🎯</span>
                                Nouveau Projet
                            </h3>
                            <p className="text-stone-100 mt-2">Remplissez les informations ci-dessous</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="nom" className="block text-sm font-semibold text-stone-700">
                                        Nom du projet <span className="text-amber-600">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nom"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white placeholder-stone-400"
                                        placeholder="Entrez le nom du projet"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="categorie" className="block text-sm font-semibold text-stone-700">
                                        Catégorie <span className="text-amber-600">*</span>
                                    </label>
                                    <select
                                        id="categorie"
                                        name="categorie"
                                        value={formData.categorie}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
                                    >
                                        <option value="interne">Interne</option>
                                        <option value="client">Client</option>
                                        <option value="r&d">R&D</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="description" className="block text-sm font-semibold text-stone-700">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white placeholder-stone-400"
                                    placeholder="Décrivez les objectifs et le contexte du projet..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="date_debut" className="block text-sm font-semibold text-stone-700">
                                        Date de début <span className="text-amber-600">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="date_debut"
                                        name="date_debut"
                                        value={formData.date_debut}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="date_fin" className="block text-sm font-semibold text-stone-700">
                                        Date de fin prévue
                                    </label>
                                    <input
                                        type="date"
                                        id="date_fin"
                                        name="date_fin"
                                        value={formData.date_fin}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="taux_horaire" className="block text-sm font-semibold text-stone-700">
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
                                        className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white placeholder-stone-400"
                                        placeholder="50.00"
                                    />
                                </div>

                                {(user?.role === 'admin' || user?.role === 'manager') && (
                                    <div className="space-y-2">
                                        <label htmlFor="equipe" className="block text-sm font-semibold text-stone-700">
                                            Équipe assignée
                                        </label>
                                        <select
                                            id="equipe"
                                            name="equipe"
                                            value={formData.equipe || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white"
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

                            <div className="flex justify-end space-x-4 pt-6 border-t border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-3 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 hover:border-stone-400 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-stone-700 to-amber-700 text-white font-semibold hover:from-stone-800 hover:to-amber-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    Créer le projet
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                
                {/* Projects List */}
                <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-stone-700 to-amber-700 px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="mr-3 text-3xl">📋</span>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Projets Existants</h3>
                                    <p className="text-stone-100 mt-1">Vue d'ensemble de vos projets</p>
                                </div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                <span className="text-white font-semibold">
                                    {projects.length} projet{projects.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {projects.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-32 h-32 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-6xl">📂</span>
                            </div>
                            <h3 className="text-2xl font-bold text-stone-800 mb-2">Aucun projet disponible</h3>
                            <p className="text-stone-600">Créez votre premier projet pour commencer</p>
                        </div>
                    ) : (
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {projects.map((project, index) => (
                                    <div 
                                        key={project.id}
                                        className="group bg-white border border-stone-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-amber-300 overflow-hidden"
                                        style={{
                                            animationDelay: `${index * 100}ms`
                                        }}
                                    >
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <h4 className="font-bold text-xl text-stone-800 group-hover:text-amber-700 transition-colors leading-tight flex-1">
                                                    {project.nom}
                                                </h4>
                                                <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(project.categorie)} flex-shrink-0`}>
                                                    <span className="mr-1">{getCategoryIcon(project.categorie)}</span>
                                                    {getCategoryLabel(project.categorie)}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center text-stone-600">
                                                    <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center mr-3">
                                                        <span className="text-stone-600">👥</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-stone-800">
                                                            {project.equipe?.nom || 'Non affecté'}
                                                        </div>
                                                        {project.equipe?.manager && (
                                                            <div className="text-sm text-stone-500">
                                                                {project.equipe.manager.prenom} {project.equipe.manager.nom}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center text-stone-600">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                                        <span className="text-amber-600">📅</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-stone-800">
                                                            {new Date(project.date_debut).toLocaleDateString('fr-FR')}
                                                        </div>
                                                        <div className="text-sm text-stone-500">
                                                            → {new Date(project.date_fin).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center text-stone-600">
                                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                                                        <span className="text-yellow-600">💰</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-yellow-700 text-lg">
                                                            {project.taux_horaire}€/h
                                                        </div>
                                                        <div className="text-sm text-stone-500">Taux horaire</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-stone-50 px-6 py-4 border-t border-stone-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-stone-600 font-medium text-sm">
                                                    Projet #{project.id}
                                                </span>
                                                <div className="flex items-center">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                    <span className="text-green-700 text-sm font-medium">Actif</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            
        </div>
    );
};

export default ProjectsManagement;