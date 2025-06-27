import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, GestureResponderEvent, KeyboardAvoidingView, Modal, PanResponder, PanResponderGestureState, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import ItemRow from '../../components/ItemRow';

// basic item structure
interface Item {
  id: string;
  text: string;
  type: 'inbox' | 'projects' | 'nextActions';
  completed: boolean;
  hidden?: boolean;
}

// project with details
interface Project {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  createdAt: string;
  completed: boolean;
  hidden?: boolean;
}

// next action with context
interface NextAction {
  id: string;
  text: string;
  context: string;
  projectId?: string;
  createdAt: string;
  completed: boolean;
  hidden?: boolean;
}

// where you can do tasks
const CONTEXTS = [
  'Work', 'Home', 'Personal', 'Computer', 'Phone', 'Office', 'Grocery Store', 'Gym', 'Car'
];

type BottomTabType = 'favourite' | 'hidden';

export default function InboxScreen() {
  // input field
  const [input, setInput] = useState('');
  
  // all items
  const [items, setItems] = useState<Item[]>([]);
  
  // project details
  const [projects, setProjects] = useState<Project[]>([]);
  
  // next action details
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  
  // modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showNextActionModal, setShowNextActionModal] = useState(false);
  
  // selected item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // project form
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  
  // next action form
  const [nextActionContext, setNextActionContext] = useState('');
  const [nextActionProjectId, setNextActionProjectId] = useState<string>('');
  
  // filters
  const [filterContext, setFilterContext] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');

  // long-press menu state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuType, setActionMenuType] = useState<'inbox' | 'project' | 'nextAction' | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // undo popup state
  const [showUndo, setShowUndo] = useState(false);
  const [undoItem, setUndoItem] = useState<Item | Project | NextAction | null>(null);
  const [undoType, setUndoType] = useState<'inbox' | 'project' | 'nextAction' | null>(null);
  const undoTimer = useRef<any>(null);

  // floating animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  // input animation
  const [showInput, setShowInput] = useState(false);
  const popupAnim = useRef(new Animated.Value(0)).current;

  // favourite items
  const [favouriteItems, setFavouriteItems] = useState<Item[]>([]);
  const [hiddenItems, setHiddenItems] = useState<Item[]>([]);
  const [isHiddenUnlocked, setIsHiddenUnlocked] = useState(false);

  // bottom fragment card state
  const [bottomTab, setBottomTab] = useState<'favourite' | 'hidden'>('favourite');

  // 1. Add state for slide animation and open/close
  const [fragmentOpen, setFragmentOpen] = useState(false);
  const fragmentAnim = useRef(new Animated.Value(0)).current;

  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        return fragmentOpen && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 30) {
          // Close fragment
          Animated.parallel([
            Animated.timing(fragmentAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(pan, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            })
          ]).start(() => setFragmentOpen(false));
        } else {
          // Snap back
          Animated.timing(pan, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(pan, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // 1. Add state for search
  const [search, setSearch] = useState('');
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Add state for blinking dots animation
  const [blinkingDots, setBlinkingDots] = useState('...');
  const dotsAnim = useRef(new Animated.Value(0)).current;

  // Add this state for force refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // 2. Animate search bar on mount
  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Add blinking dots animation
  useEffect(() => {
    const blinkDots = () => {
      const dots = ['', '.', '..', '...'];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        setBlinkingDots(dots[currentIndex]);
        currentIndex = (currentIndex + 1) % dots.length;
      }, 800);
      
      return () => clearInterval(interval);
    };
    
    blinkDots();
  }, []);

  // 3. Filter items by search
  const filteredItems = items.filter(item =>
    item.text.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const floatingAnimation = () => {
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => floatingAnimation());
    };
    floatingAnimation();
  }, [floatAnim]);

  const toggleInput = () => {
    if (showInput) {
      // hide popup
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowInput(false));
    } else {
      // show popup
      setShowInput(true);
      Animated.timing(popupAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const addItemFromFloating = () => {
    if (input.trim()) {
      const newItem: Item = {
        id: Date.now().toString(),
        text: input.trim(),
        type: 'inbox',
        completed: false,
        hidden: false
      };
      setItems([newItem, ...items]);
      setInput(''); // clear input
      toggleInput(); // hide popup after adding
    }
  };

  // move to project or next action
  const moveItem = (itemId: string, newType: 'projects' | 'nextActions') => {
    if (newType === 'projects') {
      setSelectedItemId(itemId);
      setShowProjectModal(true);
    } else {
      setSelectedItemId(itemId);
      setShowNextActionModal(true);
    }
  };

  // toggle completion
  const toggleItemCompletion = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  // toggle project completion
  const toggleProjectCompletion = (projectId: string) => {
    // Find the current project and item to get their completion status
    const currentProject = projects.find(project => project.id === projectId);
    const currentItem = items.find(item => item.id === projectId);
    
    // Use the item's completion status as the source of truth, fallback to project
    const currentCompleted = currentItem?.completed ?? currentProject?.completed ?? false;
    const newCompletedStatus = !currentCompleted;
    
    // Update projects array
    setProjects(prevProjects => 
      prevProjects.map(project => 
        project.id === projectId ? { ...project, completed: newCompletedStatus } : project
      )
    );
    
    // Also update the corresponding item
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === projectId ? { ...item, completed: newCompletedStatus } : item
      )
    );
  };

  // toggle next action completion
  const toggleNextActionCompletion = (actionId: string) => {
    // Update nextActions array with proper state management
    setNextActions(prevActions => 
      prevActions.map(action => 
        action.id === actionId ? { ...action, completed: !action.completed } : action
      )
    );
    
    // Also update the corresponding item for consistency
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === actionId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // remove/hide handlers
  const handleLongPress = (type: 'inbox' | 'project' | 'nextAction', id: string) => {
    console.log('Long press detected:', type, id); // Debug log
    setActionMenuType(type);
    setActionMenuId(id);
    setShowActionMenu(true);
  };
  const handleRemove = () => {
    let removed: any = null;
    if (actionMenuType === 'inbox') {
      removed = items.find(item => item.id === actionMenuId);
      setItems(items.filter(item => item.id !== actionMenuId));
    } else if (actionMenuType === 'project') {
      removed = projects.find(project => project.id === actionMenuId);
      setProjects(projects.filter(project => project.id !== actionMenuId));
      setItems(items.filter(item => item.id !== actionMenuId));
    } else if (actionMenuType === 'nextAction') {
      removed = nextActions.find(action => action.id === actionMenuId);
      setNextActions(nextActions.filter(action => action.id !== actionMenuId));
      setItems(items.filter(item => item.id !== actionMenuId));
    }
    setShowActionMenu(false);
    setActionMenuType(null);
    setActionMenuId(null);
    // Show undo popup
    if (removed) {
      setUndoItem(removed);
      setUndoType(actionMenuType);
      setShowUndo(true);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        setShowUndo(false);
        setUndoItem(null);
        setUndoType(null);
      }, 5000);
    }
  };
  const handleHide = () => {
    if (actionMenuType === 'inbox') {
      setItems(items.map(item => item.id === actionMenuId ? { ...item, hidden: true } : item));
    } else if (actionMenuType === 'project') {
      setProjects(projects.map(project => project.id === actionMenuId ? { ...project, hidden: true } : project));
      setItems(items.map(item => item.id === actionMenuId ? { ...item, hidden: true } : item));
    } else if (actionMenuType === 'nextAction') {
      setNextActions(nextActions.map(action => action.id === actionMenuId ? { ...action, hidden: true } : action));
      setItems(items.map(item => item.id === actionMenuId ? { ...item, hidden: true } : item));
    }
    setShowActionMenu(false);
    setActionMenuType(null);
    setActionMenuId(null);
  };

  // create project
  const createProject = () => {
    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: projectName.trim(),
      description: projectDescription.trim(),
      dueDate: projectDueDate.trim(),
      createdAt: new Date().toISOString(),
      completed: false,
      hidden: false
    };

    setProjects([newProject, ...projects]);
    
    // If there's a selected item, convert it to a project
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === selectedItemId);
      if (selectedItem) {
        setItems(items.map(item => 
          item.id === selectedItemId ? { ...item, type: 'projects' } : item
        ));
      }
    } else {
      // Create a new item for the project
      const newItem: Item = {
        id: newProject.id,
        text: newProject.name,
        type: 'projects',
        completed: false,
        hidden: false
      };
      setItems([newItem, ...items]);
    }

    // reset form
    setProjectName('');
    setProjectDescription('');
    setProjectDueDate('');
    setSelectedItemId(null);
    setShowProjectModal(false);
  };

  // create next action
  const createNextAction = () => {
    if (!nextActionContext.trim()) {
      Alert.alert('Error', 'Please select a context');
      return;
    }

    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    const newNextAction: NextAction = {
      id: Date.now().toString(),
      text: selectedItem.text,
      context: nextActionContext.trim(),
      projectId: nextActionProjectId || undefined,
      createdAt: new Date().toISOString(),
      completed: false,
      hidden: false
    };

    setNextActions([newNextAction, ...nextActions]);
    setItems(items.map(item => 
      item.id === selectedItemId ? { ...item, type: 'nextActions' } : item
    ));

    // reset form
    setNextActionContext('');
    setNextActionProjectId('');
    setSelectedItemId(null);
    setShowNextActionModal(false);
  };

  // cancel project
  const cancelProjectCreation = () => {
    setProjectName('');
    setProjectDescription('');
    setProjectDueDate('');
    setSelectedItemId(null);
    setShowProjectModal(false);
  };

  // cancel next action
  const cancelNextActionCreation = () => {
    setNextActionContext('');
    setNextActionProjectId('');
    setSelectedItemId(null);
    setShowNextActionModal(false);
  };

  // get items by type
  const getInboxItems = () => items.filter(item => item.type === 'inbox' && !item.hidden);
  const getProjectsItems = () => items.filter(item => item.type === 'projects' && !item.hidden);
  const getNextActionsItems = () => items.filter(item => item.type === 'nextActions' && !item.hidden);

  // filter next actions
  const getFilteredNextActions = () => {
    let filtered = nextActions.filter(action => !action.hidden);
    
    if (filterContext) {
      filtered = filtered.filter(action => action.context === filterContext);
    }
    
    if (filterProject) {
      filtered = filtered.filter(action => action.projectId === filterProject);
    }
    
    return filtered;
  };

  // authenticate for hidden section
  const authenticateForHidden = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view hidden items',
        fallbackLabel: 'Use passcode',
      });
      
      if (result.success) {
        setIsHiddenUnlocked(true);
      } else {
        Alert.alert('Authentication Failed', 'Please try again to view hidden items.');
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication not available on this device.');
    }
  };

  // toggle favourite
  const toggleFavourite = (itemId: string) => {
    console.log('toggleFavourite called for:', itemId);
    console.log('Current favouriteItems:', favouriteItems.map(f => f.id));
    
    // Check in items array first
    let item = items.find(i => i.id === itemId);
    if (item) {
      if (favouriteItems.find(f => f.id === itemId)) {
        console.log('Removing item from favourites:', itemId);
        setFavouriteItems(prev => {
          const newFavourites = prev.filter(f => f.id !== itemId);
          console.log('New favourites after removal:', newFavourites.map(f => f.id));
          return newFavourites;
        });
        // Force refresh
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('Adding item to favourites:', itemId);
        setFavouriteItems(prev => [item, ...prev]);
      }
      return;
    }

    // Check in projects array
    let project = projects.find(p => p.id === itemId);
    if (project) {
      if (favouriteItems.find(f => f.id === itemId)) {
        console.log('Removing project from favourites:', itemId);
        setFavouriteItems(prev => {
          const newFavourites = prev.filter(f => f.id !== itemId);
          console.log('New favourites after project removal:', newFavourites.map(f => f.id));
          return newFavourites;
        });
        // Force refresh
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('Adding project to favourites:', itemId);
        // Create an item representation of the project for favorites
        const projectItem: Item = {
          id: project.id,
          text: project.name,
          type: 'projects',
          completed: project.completed,
          hidden: project.hidden
        };
        setFavouriteItems(prev => [projectItem, ...prev]);
      }
      return;
    }

    // Check in nextActions array
    let action = nextActions.find(a => a.id === itemId);
    if (action) {
      if (favouriteItems.find(f => f.id === itemId)) {
        console.log('Removing next action from favourites:', itemId);
        setFavouriteItems(prev => {
          const newFavourites = prev.filter(f => f.id !== itemId);
          console.log('New favourites after next action removal:', newFavourites.map(f => f.id));
          return newFavourites;
        });
        // Force refresh
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('Adding next action to favourites:', itemId);
        // Create an item representation of the next action for favorites
        const actionItem: Item = {
          id: action.id,
          text: action.text,
          type: 'nextActions',
          completed: action.completed,
          hidden: action.hidden
        };
        setFavouriteItems(prev => [actionItem, ...prev]);
      }
      return;
    }
  };

  // move to hidden
  const moveToHidden = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setHiddenItems(prev => [item, ...prev]);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // restore from hidden
  const restoreFromHidden = (itemId: string) => {
    const item = hiddenItems.find(i => i.id === itemId);
    if (!item) return;

    setItems(prev => [item, ...prev]);
    setHiddenItems(prev => prev.filter(i => i.id !== itemId));
  };

  // get favourite items
  const getFavouriteItems = () => {
    console.log('getFavouriteItems called, current favourites:', favouriteItems.map(f => f.id));
    return favouriteItems.filter(item => !item.hidden);
  };
  
  // get hidden items from all arrays
  const getHiddenItems = () => {
    const hiddenInboxItems = items.filter(item => item.hidden);
    const hiddenProjectItems = projects.filter(project => project.hidden).map(project => ({
      id: project.id,
      text: project.name,
      type: 'projects' as const,
      completed: project.completed,
      hidden: project.hidden
    }));
    const hiddenNextActionItems = nextActions.filter(action => action.hidden).map(action => ({
      id: action.id,
      text: action.text,
      type: 'nextActions' as const,
      completed: action.completed,
      hidden: action.hidden
    }));
    return [...hiddenInboxItems, ...hiddenProjectItems, ...hiddenNextActionItems];
  };

  // get all items for completion toggle
  const getItemForCompletion = (itemId: string) => {
    // Check in items array
    let item = items.find(i => i.id === itemId);
    if (item) return { item, type: 'inbox' as const };
    
    // Check in projects array
    let project = projects.find(p => p.id === itemId);
    if (project) return { item: project, type: 'project' as const };
    
    // Check in nextActions array
    let action = nextActions.find(a => a.id === itemId);
    if (action) return { item: action, type: 'nextAction' as const };
    
    return null;
  };

  // share handler
  const handleShare = async () => {
    let message = '';
    if (actionMenuType === 'inbox') {
      const item = items.find(i => i.id === actionMenuId);
      if (item) message = item.text;
    } else if (actionMenuType === 'project') {
      const project = projects.find(p => p.id === actionMenuId);
      if (project) {
        message = `Project: ${project.name}\n${project.description ? 'Description: ' + project.description + '\n' : ''}${project.dueDate ? 'Due: ' + project.dueDate : ''}`;
      }
    } else if (actionMenuType === 'nextAction') {
      const action = nextActions.find(a => a.id === actionMenuId);
      if (action) {
        message = `Next Action: ${action.text}\nContext: ${action.context}`;
        if (action.projectId) {
          const project = projects.find(p => p.id === action.projectId);
          if (project) message += `\nProject: ${project.name}`;
        }
      }
    }
    if (message) {
      try {
        await Share.share({ message });
      } catch (e) {
        Alert.alert('Share failed', 'Could not share this item.');
      }
    }
    setShowActionMenu(false);
    setActionMenuType(null);
    setActionMenuId(null);
  };

  // Utility: get item by id from all sources
  const getItemById = (id: string) => {
    return items.find(i => i.id === id) || projects.find(p => p.id === id) || nextActions.find(a => a.id === id);
  };

  // Utility: get favourite state
  const isFavourite = (id: string) => {
    return favouriteItems.some(f => f.id === id);
  };

  // Utility: get completion state
  const isCompleted = (id: string) => {
    const item = getItemById(id);
    return item ? item.completed : false;
  };

  // Utility: toggle completion
  const handleToggleComplete = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) return toggleItemCompletion(id);
    const project = projects.find(p => p.id === id);
    if (project) return toggleProjectCompletion(id);
    const action = nextActions.find(a => a.id === id);
    if (action) return toggleNextActionCompletion(id);
  };

  // Utility: toggle favourite
  const handleToggleFavourite = (id: string) => {
    toggleFavourite(id);
  };

  // Utility: handle long press
  const handleLongPressItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) return handleLongPress('inbox', id);
    const project = projects.find(p => p.id === id);
    if (project) return handleLongPress('project', id);
    const action = nextActions.find(a => a.id === id);
    if (action) return handleLongPress('nextAction', id);
  };

  // Render generic item row
  const renderGenericItem = ({ item }: { item: Item | NextAction }) => {
    const showActions = (item as Item).type === 'inbox' && !item.completed;
    const actions = showActions ? (
      <>
        <TouchableOpacity
          style={[styles.actionButton, styles.projectButton]}
          onPress={() => moveItem(item.id, 'projects')}
        >
          <Text style={styles.buttonText}>Project</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.nextActionButton]}
          onPress={() => moveItem(item.id, 'nextActions')}
        >
          <Text style={styles.buttonText}>Next Action</Text>
        </TouchableOpacity>
      </>
    ) : null;
    // Show context for next action items
    const meta = (item as NextAction).context ? (
      <Text style={{ fontSize: 12, color: '#FF9500', fontWeight: 'bold', marginTop: 2 }}>
        {(item as NextAction).context}
      </Text>
    ) : undefined;
    return (
      <ItemRow
        id={item.id}
        text={item.text}
        completed={item.completed}
        isFavourite={isFavourite(item.id)}
        onToggleComplete={() => handleToggleComplete(item.id)}
        onToggleFavourite={() => handleToggleFavourite(item.id)}
        onLongPress={() => handleLongPressItem(item.id)}
        type={(item as Item).type ? (item as Item).type : 'nextActions'}
        actions={actions}
        meta={meta}
      />
    );
  };

  // filter section
  const renderFilterSection = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Filter Next Actions</Text>
      
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Context:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterContext && styles.filterChipActive]}
            onPress={() => setFilterContext('')}
          >
            <Text style={[styles.filterChipText, !filterContext && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {CONTEXTS.map(context => (
            <TouchableOpacity 
              key={context}
              style={[styles.filterChip, filterContext === context && styles.filterChipActive]}
              onPress={() => setFilterContext(filterContext === context ? '' : context)}
            >
              <Text style={[styles.filterChipText, filterContext === context && styles.filterChipTextActive]}>{context}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Project:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterProject && styles.filterChipActive]}
            onPress={() => setFilterProject('')}
          >
            <Text style={[styles.filterChipText, !filterProject && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {projects.filter(p => !p.hidden).map(project => (
            <TouchableOpacity 
              key={project.id}
              style={[styles.filterChip, filterProject === project.id && styles.filterChipActive]}
              onPress={() => setFilterProject(filterProject === project.id ? '' : project.id)}
            >
              <Text style={[styles.filterChipText, filterProject === project.id && styles.filterChipTextActive]}>{project.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // section with count
  const renderSection = (title: string, items: Item[], color: string) => {
    const completedCount = items.filter(item => item.completed).length;
    const totalCount = items.length;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          {title} ({totalCount - completedCount}/{totalCount})
        </Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderGenericItem}
          ListEmptyComponent={<Text style={styles.empty}>No items</Text>}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // render watermark
  const renderWatermark = () => (
    <View style={styles.watermarkContainer}>
      <Text style={styles.watermarkText}>Harsh Verma</Text>
    </View>
  );

  // next actions section
  const renderNextActionsSection = () => {
    const filteredActions = getFilteredNextActions();
    const completedCount = filteredActions.filter(action => action.completed).length;
    const totalCount = filteredActions.length;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          Next Actions ({totalCount - completedCount}/{totalCount})
        </Text>
        {renderFilterSection()}
        <FlatList
          data={filteredActions}
          keyExtractor={(item) => item.id}
          renderItem={renderGenericItem}
          ListEmptyComponent={<Text style={styles.empty}>No next actions</Text>}
          scrollEnabled={true}
        />
      </View>
    );
  };

  // render action menu
  const renderActionMenu = () => (
    showActionMenu && (
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity 
              style={styles.menuBtn}
              onPress={handleShare}
            >
              <Text style={styles.menuBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuBtn}
              onPress={() => {
                if (actionMenuType === 'inbox') {
                  const item = items.find(i => i.id === actionMenuId);
                  if (item) toggleFavourite(item.id);
                } else if (actionMenuType === 'project') {
                  const project = projects.find(p => p.id === actionMenuId);
                  if (project) toggleFavourite(project.id);
                } else if (actionMenuType === 'nextAction') {
                  const action = nextActions.find(a => a.id === actionMenuId);
                  if (action) toggleFavourite(action.id);
                }
                setShowActionMenu(false);
                setActionMenuType(null);
                setActionMenuId(null);
              }}
            >
              <Text style={styles.menuBtnText}>
                {(actionMenuType === 'inbox' && favouriteItems.find(f => f.id === actionMenuId)) ||
                 (actionMenuType === 'project' && favouriteItems.find(f => f.id === actionMenuId)) ||
                 (actionMenuType === 'nextAction' && favouriteItems.find(f => f.id === actionMenuId))
                  ? 'Remove from Favourites' 
                  : 'Add to Favourites'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuBtn}
              onPress={() => {
                if (actionMenuType === 'inbox') {
                  moveToHidden(actionMenuId!);
                } else if (actionMenuType === 'project') {
                  const project = projects.find(p => p.id === actionMenuId);
                  if (project) {
                    project.hidden = true;
                    setProjects(prev => prev.map(p => p.id === actionMenuId ? { ...p, hidden: true } : p));
                  }
                } else if (actionMenuType === 'nextAction') {
                  const action = nextActions.find(a => a.id === actionMenuId);
                  if (action) {
                    action.hidden = true;
                    setNextActions(prev => prev.map(a => a.id === actionMenuId ? { ...a, hidden: true } : a));
                  }
                }
                setShowActionMenu(false);
                setActionMenuType(null);
                setActionMenuId(null);
              }}
            >
              <Text style={styles.menuBtnText}>Hide</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuBtn, { borderBottomWidth: 0 }]}
              onPress={handleRemove}
            >
              <Text style={[styles.menuBtnText, { color: '#FF3B30' }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    )
  );

  // Undo handler
  const handleUndo = () => {
    if (!undoItem || !undoType) return;

    if (undoType === 'inbox') {
      setItems(prev => [undoItem as Item, ...prev]);
    } else if (undoType === 'project') {
      setProjects(prev => [undoItem as Project, ...prev]);
      setItems(prev => [undoItem as Item, ...prev]);
    } else if (undoType === 'nextAction') {
      setNextActions(prev => [undoItem as NextAction, ...prev]);
      setItems(prev => [undoItem as Item, ...prev]);
    }

    setShowUndo(false);
    setUndoItem(null);
    setUndoType(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  // render undo popup
  const renderUndoPopup = () => (
    showUndo && (
      <Animated.View style={styles.undoPopup}>
        <View style={styles.undoTextContainer}>
          <Text style={styles.undoText}>Item deleted</Text>
        </View>
        <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
          <Text style={styles.undoBtnText}>UNDO</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  );

  // 2. Animate on tab click
  const handleTabPress = (tab: BottomTabType) => {
    if (bottomTab === tab && fragmentOpen) {
      // Close
      Animated.timing(fragmentAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setFragmentOpen(false));
    } else {
      setBottomTab(tab);
      setFragmentOpen(true);
      Animated.timing(fragmentAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // 3. Update renderBottomFragmentCard to use Animated.View and slide up
  const renderBottomFragmentCard = () => {
    const maxHeight = 320;
    const minHeight = 60;
    const height = fragmentAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [minHeight, maxHeight],
    });
    const translateY = pan.interpolate({
      inputRange: [0, 400],
      outputRange: [0, 400],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View
        style={[styles.bottomFragmentCard, { height, transform: [{ translateY }] }]}
      > 
        <View style={styles.bottomTabsRow}>
          <TouchableOpacity
            style={[styles.bottomTabPill, bottomTab === 'favourite' && styles.bottomTabPillActive]}
            onPress={() => handleTabPress('favourite')}
          >
            <Text style={[styles.bottomTabPillText, bottomTab === 'favourite' && styles.bottomTabPillTextActive]}>Favourite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomTabPill, bottomTab === 'hidden' && styles.bottomTabPillActive]}
            onPress={() => handleTabPress('hidden')}
          >
            <Text style={[styles.bottomTabPillText, bottomTab === 'hidden' && styles.bottomTabPillTextActive]}>Hidden</Text>
          </TouchableOpacity>
        </View>
        {fragmentOpen && (
          <View style={styles.bottomFragmentCardContent}>
            {bottomTab === 'favourite' ? (
              <View key={refreshKey}>
                {getFavouriteItems().length > 0 ? (
                  getFavouriteItems().map(item =>
                    renderGenericItem({ item: { ...item, type: 'projects' } })
                  )
                ) : (
                  <Text style={styles.emptyText}>No favourite items</Text>
                )}
              </View>
            ) : (
              <View>
                {!isHiddenUnlocked && (
                  <TouchableOpacity 
                    style={styles.unlockBtn}
                    onPress={authenticateForHidden}
                  >
                    <Text style={styles.unlockBtnText}>Unlock</Text>
                  </TouchableOpacity>
                )}
                {isHiddenUnlocked ? (
                  getHiddenItems().length > 0 ? (
                    getHiddenItems().map(item =>
                      renderGenericItem({ item })
                    )
                  ) : (
                    <Text style={styles.emptyText}>No hidden items</Text>
                  )
                ) : (
                  <Text style={styles.lockedText}>🔒 Tap "Unlock" to view hidden items</Text>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  // Place this before the return statement in InboxScreen:
  const fabBottom = fragmentOpen ? 450 : 80;

  const fabStyle: ViewStyle = {
    position: 'absolute',
    bottom: fabBottom,
    right: 32,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#654321',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 1000,
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Personal Productivity{blinkingDots}</Text>
      </View>
      
      {/* Floating Add Button */}
      <Animated.View
        style={[
          fabStyle,
          {
            transform: [
              {
                translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.fabTouchable} 
          onPress={toggleInput}
          activeOpacity={0.7}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Half-size Floating Popup */}
      {showInput && (
        <Modal
          visible={showInput}
          transparent
          animationType="none"
          onRequestClose={toggleInput}
        >
          <KeyboardAvoidingView 
            style={styles.popupOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <Animated.View
              style={[
                styles.halfScreenPopup,
                {
                  transform: [
                    {
                      translateY: popupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>Add New Task</Text>
                <TouchableOpacity onPress={toggleInput} style={styles.closePopupBtn}>
                  <Text style={styles.closePopupBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.popupContent} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.popupInput}
                  placeholder="Enter your task, idea, or to-do..."
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={addItemFromFloating}
                  returnKeyType="done"
                  autoFocus={true}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>
              
              <View style={styles.popupButtonContainer}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.addTaskBtn, { flex: 1, backgroundColor: '#654321' }]}
                    onPress={addItemFromFloating}
                  >
                    <Text style={styles.addTaskBtnText}>Inbox</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addTaskBtn, { flex: 1, backgroundColor: '#654321' }]}
                    onPress={() => {
                      toggleInput();
                      setShowProjectModal(true);
                    }}
                  >
                    <Text style={[styles.addTaskBtnText, { color: 'white' }]}>Project</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* 4. In render, below headerBar, add: */}
      <Animated.View
        style={{
          opacity: searchAnim,
          transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          marginBottom: 16,
        }}
      >
        <View style={styles.searchBarRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search Your Tasks..."
            placeholderTextColor="#ccc"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </Animated.View>

      <FlatList
        data={[
          { title: 'Inbox', items: getInboxItems(), color: '#007AFF' },
          { title: 'Projects', items: getProjectsItems(), color: '#34C759', isProjects: true }
        ]}
        keyExtractor={(section) => section.title}
        renderItem={({ item }) => renderSection(item.title, item.items, item.color)}
        ListFooterComponent={() => (
          <View>
            {renderNextActionsSection()}
            {renderWatermark()}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items yet.</Text>}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Project Modal */}
      <Modal
        visible={showProjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelProjectCreation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Project</Text>
            
            <Text style={styles.inputLabel}>Project Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter project name"
              value={projectName}
              onChangeText={setProjectName}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Enter project description"
              value={projectDescription}
              onChangeText={setProjectDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Due Date</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 2024-12-31"
              value={projectDueDate}
              onChangeText={setProjectDueDate}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelProjectCreation}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={createProject}
              >
                <Text style={styles.createButtonText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Next Action Modal */}
      <Modal
        visible={showNextActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelNextActionCreation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Next Action</Text>
            
            <Text style={styles.inputLabel}>Context *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contextScroll}>
              {CONTEXTS.map(context => (
                <TouchableOpacity 
                  key={context}
                  style={[styles.contextChip, nextActionContext === context && styles.contextChipActive]}
                  onPress={() => setNextActionContext(context)}
                >
                  <Text style={[styles.contextChipText, nextActionContext === context && styles.contextChipTextActive]}>{context}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Project (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
              <TouchableOpacity 
                style={[styles.projectChip, !nextActionProjectId && styles.projectChipActive]}
                onPress={() => setNextActionProjectId('')}
              >
                <Text style={[styles.projectChipText, !nextActionProjectId && styles.projectChipTextActive]}>No Project</Text>
              </TouchableOpacity>
              {projects.filter(p => !p.hidden).map(project => (
                <TouchableOpacity 
                  key={project.id}
                  style={[styles.projectChip, nextActionProjectId === project.id && styles.projectChipActive]}
                  onPress={() => setNextActionProjectId(project.id)}
                >
                  <Text style={[styles.projectChipText, nextActionProjectId === project.id && styles.projectChipTextActive]}>{project.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelNextActionCreation}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={createNextAction}
              >
                <Text style={styles.createButtonText}>Create Next Action</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {renderActionMenu()}
      {renderUndoPopup()}
      {fragmentOpen && (
        <TouchableOpacity
          style={styles.fragmentOverlay}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(fragmentAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }).start(() => setFragmentOpen(false));
            Animated.timing(pan, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }).start();
          }}
        />
      )}
      {renderBottomFragmentCard()}
    </View>
  );
}

// styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFDD0',
  },
  headerBar: {
    width: '120%',
    backgroundColor: '#966F33',
    paddingTop: 36,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -20,
    marginTop: -20,
    marginRight: -20,
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'TradeWinds',
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    backgroundColor: '#232323',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#966F33',
    borderRadius: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'white',
    fontFamily: 'TradeWinds',
  },
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  itemCompleted: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  nextActionItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  itemText: {
    fontSize: 16,
    marginBottom: 8,
    flex: 1,
    color: '#000',
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  projectContent: {
    flex: 1,
  },
  nextActionContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#34C759',
  },
  projectDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  projectDueDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  empty: {
    textAlign: 'center',
    color: 'white',
    fontStyle: 'italic',
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    fontFamily: 'TradeWinds',
  },
  filterRow: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  contextScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  projectScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  contextChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  contextChipActive: {
    backgroundColor: '#FF9500',
  },
  contextChipText: {
    fontSize: 12,
    color: '#666',
  },
  contextChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  projectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  projectChipActive: {
    backgroundColor: '#34C759',
  },
  projectChipText: {
    fontSize: 12,
    color: '#666',
  },
  projectChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#000',
    fontFamily: 'TradeWinds',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#B20000',
    fontFamily: 'TradeWinds',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: 220,
    alignItems: 'stretch',
    elevation: 4,
  },
  menuBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuBtnText: {
    fontSize: 16,
    color: '#333',
  },
  undoPopup: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: '50%',
    backgroundColor: 'transparent',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 100,
    elevation: 10,
  },
  undoTextContainer: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 4,
  },
  undoText: {
    color: '#333',
    fontSize: 13,
    marginRight: 12,
    fontWeight: '500',
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  undoBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
  },
  fabText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  halfScreenPopup: {
    backgroundColor: 'white',
    minHeight: '50%',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'TradeWinds',
  },
  closePopupBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePopupBtnText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  popupContent: {
    flex: 1,
  },
  popupButtonContainer: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  popupInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 100,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  addTaskBtn: {
    backgroundColor: '#654321',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addTaskBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomFragmentCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#654321',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 500,
    overflow: 'hidden',
  },
  bottomTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
  },
  bottomTabPill: {
    backgroundColor: 'white',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 0,
    width: 150,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  bottomTabPillActive: {
    backgroundColor: '#FFD700',
  },
  bottomTabPillText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomTabPillTextActive: {
    color: '#232323',
  },
  bottomFragmentCardContent: {
    minHeight: 60,
    maxHeight: 220,
  },
  bottomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
  },
  favouriteBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    marginLeft: 8,
  },
  favouriteBtnText: {
    color: '#232323',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unlockBtn: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  unlockBtnText: {
    color: '#232323',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#34C759',
    marginLeft: 8,
  },
  restoreBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockedText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  fragmentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.01)',
    zIndex: 400,
  },
  heartBtn: {
    marginLeft: 10,
    padding: 4,
  },
  heartIcon: {
    fontSize: 20,
    color: '#888',
  },
  heartIconActive: {
    color: 'red',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  checkboxCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  projectButton: {
    backgroundColor: '#34C759',
  },
  nextActionButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nextActionText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    flex: 1,
    color: '#000',
  },
  nextActionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextTag: {
    backgroundColor: '#FF9500',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectTag: {
    backgroundColor: '#34C759',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#666',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 18,
    color: '#aaa',
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  watermarkContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  watermarkText: {
    color: 'rgba(150, 111, 51, 0.3)',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'TradeWinds',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
}); 