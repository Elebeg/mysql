import express, { Request, Response } from "express";
import mysql from "mysql2/promise";

const app = express();

// Configura EJS como a engine de renderização de templates
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static('public'));

const connection = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "mudar123",
    database: "unicesumar"
});

// Middleware para permitir dados no formato JSON
app.use(express.json());
// Middleware para permitir dados no formato URLENCODED
app.use(express.urlencoded({ extended: true }));

// Rota para listar todos os usuários
app.get('/users', async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM users");
    return res.render('users/index', {
        users: rows
    });
});

// Rota para mostrar o formulário de cadastro de novos usuários
app.get('/users/form', (req: Request, res: Response) => {
    return res.render('users/form');
});

// Rota para salvar um novo usuário
app.post('/users/save', async (req: Request, res: Response) => {
    const { username, email, password, confirmPassword, role, active } = req.body;

    // Verifica se as senhas coincidem
    if (password !== confirmPassword) {
        return res.status(400).send("As senhas não coincidem.");
    }

    try {
        // Verifica se o email já está cadastrado
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if ((rows as any[]).length > 0) {
            return res.status(400).send('Este email já está cadastrado. Por favor, use outro.');
        }

        const insertQuery = "INSERT INTO users (username, email, password, role, active) VALUES (?, ?, ?, ?, ?)";

        await connection.query(insertQuery, [username, email, password, role, active === "on"]);

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao salvar o usuário.');
    }
});


// Deletando usuário
app.post('/users/delete/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    const sqlDelete = "DELETE FROM users WHERE id = ?";
    await connection.query(sqlDelete, [id]);
    res.redirect('/users');
});

// Rota para exibir a página de login
app.get('/login', (req: Request, res: Response) => {
    return res.render('users/login'); 
});

// Rota para processar o login
app.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        // Consulta o banco de dados para encontrar o usuário com o email fornecido
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

        if ((rows as any[]).length > 0) {
            res.redirect('/posts');
        } else {
            res.status(401).send('Credenciais inválidas. Tente novamente.');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao processar o login.');
    }
});

// Rota para exibir os posts
app.get('/posts', async (req: Request, res: Response) => {
    try {
        const [posts] = await connection.query('SELECT * FROM posts');
        res.render('users/posts', { posts });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Erro ao buscar posts.');
    }
});

// Função para inserir posts iniciais
async function insertInitialPosts() {
    const posts = [
        {
            title: 'O Primeiro Passo na Lua',
            description: 'Em 20 de julho de 1969, a humanidade deu seu primeiro passo fora da Terra. A missão Apollo 11 levou Neil Armstrong e Buzz Aldrin à Lua.',
            imageUrl: 'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
        {
            title: 'A Descoberta da Penicilina',
            description: 'Em 1928, Alexander Fleming mudou a medicina ao descobrir a penicilina, o primeiro antibiótico eficaz contra infecções.',
            imageUrl: 'https://plus.unsplash.com/premium_photo-1664392448838-b5b03738aafb?q=80&w=1948&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
        {
            title: 'A Teoria da Relatividade de Einstein',
            description: 'Em 1905, Albert Einstein apresentou a Teoria da Relatividade, revolucionando nossa compreensão do universo.',
            imageUrl: 'https://s1.static.brasilescola.uol.com.br/be/conteudo/images/de-acordo-com-relatividade-geral-grandes-massas-alteram-curvatura-espaco-produzindo-gravidade-5b64c5b370c03.jpg',
        },
        {
            title: 'A Queda do Muro de Berlim',
            description: 'Em 9 de novembro de 1989, o Muro de Berlim foi derrubado, marcando o início da reunificação da Alemanha.',
            imageUrl: 'https://i0.wp.com/bernadetealves.com/wp-content/uploads/2019/11/Queda-do-Muro-de-Berlim-completa-30-anos-1989-Bernadete-Alves.jpeg?resize=910%2C604&ssl=1',
        },
        {
            title: 'A Primeira Imagem de um Buraco Negro',
            description: 'Em 2019, cientistas revelaram a primeira imagem de um buraco negro na galáxia M87, a 55 milhões de anos-luz da Terra.',
            imageUrl: 'https://plus.unsplash.com/premium_photo-1690571200236-0f9098fc6ca9?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
    ];

    for (const post of posts) {
        const insertQuery = "INSERT INTO posts (title, description, image_url) VALUES (?, ?, ?)";
        await connection.query(insertQuery, [post.title, post.description, post.imageUrl]);
    }
}

// Função para verificar se já existem posts
async function checkIfPostsExist() {
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM posts');
    return (rows[0].count > 0);
}

// Chamando a função para inserir os posts iniciais, se necessário
async function initializePosts() {
    const exists = await checkIfPostsExist();
    if (!exists) {
        await insertInitialPosts();
    }
}

initializePosts().catch(console.error);

// Iniciando o servidor
app.listen('3000', () => console.log("Server is listening on port 3000"));
