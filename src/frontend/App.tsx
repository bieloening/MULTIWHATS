import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import './App.css'; // Importar o arquivo CSS

const Conexoes = lazy(() => import('./Conexoes'));
const Chat = lazy(() => import('./Chat'));

const App: React.FC = () => {
    return (
        <Router>
            <Suspense fallback={<div>Carregando...</div>}>
                <Switch>
                    <Route exact path="/conexoes" component={Conexoes} />
                    <Route exact path="/chat" component={Chat} />
                    <Route exact path="/" component={Conexoes} />
                </Switch>
            </Suspense>
        </Router>
    );
};

export default App;