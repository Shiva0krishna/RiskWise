import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { ChevronDown, Plus, Building } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Project {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  structural_system: string | null;
  progress_percent: number | null;
  created_at: string;
  updated_at: string;
}

interface ProjectSelectorProps {
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
}

export function ProjectSelector({ selectedProject, onProjectSelect }: ProjectSelectorProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    city: '',
    structural_system: '',
    progress_percent: 0,
  });

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (!selectedProject && data && data.length > 0) {
        onProjectSelect(data[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    if (!user || !newProject.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: newProject.name.trim(),
          description: newProject.description.trim() || null,
          city: newProject.city.trim() || null,
          structural_system: newProject.structural_system.trim() || null,
          progress_percent: newProject.progress_percent,
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      onProjectSelect(data);
      setShowCreateModal(false);
      setNewProject({
        name: '',
        description: '',
        city: '',
        structural_system: '',
        progress_percent: 0,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.selectorContent}>
          <Building color="#3B82F6" size={20} />
          <View style={styles.selectorText}>
            <Text style={styles.selectorTitle}>
              {selectedProject ? selectedProject.name : 'Select Project'}
            </Text>
            {selectedProject && (
              <Text style={styles.selectorSubtitle}>
                {selectedProject.city} • {selectedProject.structural_system}
              </Text>
            )}
          </View>
          <ChevronDown color="#6B7280" size={20} />
        </View>
      </TouchableOpacity>

      {/* Project Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setShowModal(false);
                setShowCreateModal(true);
              }}
            >
              <Plus color="#3B82F6" size={20} />
              <Text style={styles.createButtonText}>New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.projectsList}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[
                  styles.projectItem,
                  selectedProject?.id === project.id && styles.selectedProject,
                ]}
                onPress={() => {
                  onProjectSelect(project);
                  setShowModal(false);
                }}
              >
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectDetails}>
                    {project.city} • {project.structural_system}
                  </Text>
                  <Text style={styles.projectProgress}>
                    Progress: {project.progress_percent || 0}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Button
            title="Close"
            onPress={() => setShowModal(false)}
            style={styles.closeButton}
          />
        </View>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Project</Text>
          </View>

          <ScrollView style={styles.createForm}>
            <Input
              label="Project Name"
              value={newProject.name}
              onChangeText={(value) => setNewProject(prev => ({ ...prev, name: value }))}
              placeholder="Enter project name"
            />

            <Input
              label="Description"
              value={newProject.description}
              onChangeText={(value) => setNewProject(prev => ({ ...prev, description: value }))}
              placeholder="Enter project description"
              multiline
            />

            <Input
              label="City"
              value={newProject.city}
              onChangeText={(value) => setNewProject(prev => ({ ...prev, city: value }))}
              placeholder="Enter city"
            />

            <Input
              label="Structural System"
              value={newProject.structural_system}
              onChangeText={(value) => setNewProject(prev => ({ ...prev, structural_system: value }))}
              placeholder="e.g., Mega-Frame, Steel Frame, Concrete"
            />

            <Input
              label="Progress (%)"
              value={newProject.progress_percent.toString()}
              onChangeText={(value) => setNewProject(prev => ({ 
                ...prev, 
                progress_percent: parseFloat(value) || 0 
              }))}
              placeholder="Enter completion percentage"
              keyboardType="numeric"
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowCreateModal(false)}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Create Project"
              onPress={createProject}
              loading={loading}
              style={styles.createProjectButton}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    flex: 1,
    marginLeft: 12,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  projectsList: {
    flex: 1,
    padding: 24,
  },
  projectItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedProject: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#EBF8FF',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  projectDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  projectProgress: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  closeButton: {
    margin: 24,
    marginTop: 0,
  },
  createForm: {
    flex: 1,
    padding: 24,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createProjectButton: {
    flex: 1,
  },
});