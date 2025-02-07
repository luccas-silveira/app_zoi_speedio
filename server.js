if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const fs = require('fs');
const path = require('path');

// ------------------------------
// Persistência de Usuários via JSON
// ------------------------------
const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

let users = [];
if (fs.existsSync(usersFilePath)) {
  try {
    const fileData = fs.readFileSync(usersFilePath, 'utf-8');
    users = JSON.parse(fileData);
  } catch (e) {
    console.error('Erro ao ler os dados dos usuários:', e);
    users = [];
  }
} else {
  users = [];
}

function saveUsers() {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar os usuários:', e);
  }
}

// ------------------------------
// Configuração do Multer para Upload de CSV
// ------------------------------
const multer = require('multer');
const csv = require('csv-parser');

// Cria a pasta "uploads" se ela não existir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Os arquivos serão salvos na pasta "uploads"
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ------------------------------
// Inicialização do Passport
// ------------------------------
const initializePassport = require('./passport-config');
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);

// ------------------------------
// Configurações Gerais
// ------------------------------
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// ------------------------------
// Rotas da Aplicação
// ------------------------------

// Dashboard: somente para usuários autenticados
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name });
});

// Rotas de Login
app.get('/login', (req, res) => {
  res.render('login.ejs');
});
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

// Rotas de Registro
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs');
});
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.senha, 10);
    const user = { 
      id: Date.now().toString(),
      name: req.body.nome,
      email: req.body.email,
      password: hashedPassword
    };
    users.push(user);
    saveUsers();  // Persistindo os dados do novo usuário
    res.redirect('/login');
  } catch (e) {
    console.error(e);
    res.redirect('/register');
  }
});

// Rota para logout
app.delete('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});

// Rota GET para exibir a página de upload (upload.ejs)
app.get('/upload', (req, res) => {
  res.render('upload'); // Certifique-se de que o arquivo upload.ejs esteja em /views
});

// Rota POST para tratar o upload do CSV
app.post('/upload', upload.single('csvfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo foi enviado.');
  }
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.render('display', { data: results });
    })
    .on('error', (err) => {
      console.error('Erro ao ler o arquivo CSV:', err);
      res.status(500).send('Erro ao processar o arquivo CSV.');
    });
});

// ------------------------------
// Middlewares Auxiliares
// ------------------------------
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

// ------------------------------
// Inicia o Servidor
// ------------------------------
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
