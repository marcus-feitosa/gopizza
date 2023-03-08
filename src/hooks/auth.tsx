import React, {
    createContext,
    useContext,
    ReactNode,
    useState,
    useEffect
} from 'react' 
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User={
    id: string;
    name: string;
    isAdmin: boolean;
}

type AuthContextData={
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    isLogging : boolean;
    user: User | null;
}

type AuthProviderProps ={
    children: ReactNode;
}

const USER_COLLECTION = '@gopizza:users';

export const AuthContext = createContext({} as AuthContextData);

function AuthProvider({children}: AuthProviderProps){
    const [isLogging, setIsLoggin] = useState(false);

    const [user, setUser] = useState<User | null>(null);

    async function signIn(email: string, password: string){
        if(!email || !password){
            return Alert.alert('Login', 'Informe o email e a senha')
        }
        setIsLoggin(true);
        auth().signInWithEmailAndPassword(email, password).then(account=>{
            firestore()
            .collection('users')
            .doc(account.user.uid)
            .get()
            .then(async (profile) => {
                const {name, isAdmin} = profile.data() as User;

            if(profile.exists){
                const userData = {
                    id: account.user.uid,
                    name,
                    isAdmin
                }
                await AsyncStorage.setItem(USER_COLLECTION, JSON.stringify(userData));
                setUser(userData);
            }
            }).catch(() => Alert.alert('Login', 'Não foi possivel buscar os dados de login do usuário'))
        }).catch(error=>{
            const {code} = error.code
            if(code === 'user/user-not-found' || code === 'auth/wrong-password'){
                return Alert.alert('Login', 'E-mail e/ou senha inválida.')
        }else{
            return Alert.alert('Login', 'Não foi possivel realizar o login')
        }
    }).finally(() => setIsLoggin(false))}

    async function loadUserStorageData(){
        setIsLoggin(true);

        const storedUser = await AsyncStorage.getItem(USER_COLLECTION);

        if(storedUser){
            const userData = JSON.parse(storedUser) as User;
            setUser(userData);
        }
        setIsLoggin(false);
    }
    
    async function signOut(){
        await auth().signOut();
        await AsyncStorage.removeItem(USER_COLLECTION);
        setUser(null);
    }

    async function forgotPassword(email:string){
        if(!email){
            return Alert.alert('Redefinir', 'Email não informado!')
        }

        auth().sendPasswordResetEmail(email)
        .then(() => Alert.alert('Redefinir', 'Enviamos um link de redefinição para você.'))
        .catch(() => Alert.alert('Redefinir', 'Não foi possível redefinir sua senha.'))
    }
    useEffect(() => {loadUserStorageData}, []);
    return(
        <AuthContext.Provider value={{signIn, signOut, isLogging, user, forgotPassword}}>
            {children}
        </AuthContext.Provider>
    )
}

function useAuth(){
    const context = useContext(AuthContext);

    return context;
}

export {AuthProvider, useAuth};