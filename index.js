require('dotenv').config();
const mysql = require('mysql2');
const inquirer = require('inquirer');
const fs = require('fs');
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
})

function newMainChoice () {
    console.log('\n');
    setTimeout(mainChoice, 100);
}

function query(...args){
    const query = args[0];
    const placeholders = args.slice(1);
    db.execute(query, placeholders, (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        if (query.toUpperCase().includes('SELECT')) {
            console.table(results);
        }
    });
}

async function mainChoice() {
    const { mainChoice } = await
    inquirer.prompt([
        {
            type: 'list',
            name: 'mainChoice',
            message: 'What would you like to do?',
            choices: [
                'View All Employees',
                'View All Departments',
                'View All Roles',
                'Add Employee',
                'Add Department',
                'Add Role',
                'Update Employee Role',
                'Quit'
            ]
        }
    ])
    switch (mainChoice) {
        case 'View All Departments':
            query('SELECT * FROM department');
            newMainChoice();
            break;
        case 'View All Roles':
            query(`
                SELECT role.id, role.title, role.salary, department.name AS department
                FROM role
                JOIN department ON role.department_id = department.id
                ORDER by role.id;
                `);
            newMainChoice();
            break;
        case 'View All Employees':
            query(`
            SELECT emp.id, emp.first_name, emp.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, ' ', manager.last_name) AS manager
            FROM employee emp
            LEFT JOIN employee manager ON manager.id = emp.manager_id
            LEFT JOIN role ON emp.role_id = role.id
            LEFT JOIN department ON role.department_id = department.id
            ORDER BY emp.id;
            `);
            newMainChoice();
            break;
        case 'Add Department':
            const { departmentName } = await
            inquirer.prompt([
                {
                    type: 'input',
                    name: 'departmentName',
                    message: 'What is the name of the new department?'
                }
            ])
            query('INSERT INTO department (name) VALUES (?)', departmentName);
            newMainChoice();
            break;
        case 'Add Role':
            db.execute('SELECT * FROM department', (err, results) => {
                if (err) {
                    console.log(err);
                    return;
                }
                const departments = results.map(department => {
                    return {
                        name: department.name,
                        value: department.id
                    }
                })
                inquirer.prompt([
                    {
                        type: 'input',
                        name: 'roleTitle',
                        message: 'What is the title of the new role?'
                    },
                    {
                        type: 'input',
                        name: 'roleSalary',
                        message: 'What is the salary of the new role?'
                    },
                    {
                        type: 'list',
                        name: 'roleDepartment',
                        message: 'What department does the new role belong to?',
                        choices: departments
                    }
                ]).then(answers => {
                    query('INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)', answers.roleTitle, answers.roleSalary, answers.roleDepartment);
                    newMainChoice();
                })
            })
            break;
        case 'Add Employee':
            db.execute('SELECT * FROM role', (err, results) => {
                if (err) {
                    console.log(err);
                    return;
                }
                const roles = results.map(role => {
                    return {
                        name: role.title,
                        value: role.id
                    }
                })
                db.execute('SELECT * FROM employee', async (err, results) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    const managers = results.map(employee => {
                        return {
                            name: `${employee.first_name} ${employee.last_name}`,
                            value: employee.id
                        }
                    })
                    managers.unshift({ name: 'None', value: null });
                    const {firstName, lastName, role, manager} = await inquirer.prompt([
                        {
                            'name': 'firstName',
                            'type': 'input',
                            'message': 'What is the first name of the new employee?'
                        },
                        {
                            'name': 'lastName',
                            'type': 'input',
                            'message': 'What is the last name of the new employee?'
                        },
                        {
                            'name': 'role',
                            'type': 'list',
                            'message': 'What is the role of the new employee?',
                            'choices': roles
                        },
                        {
                            'name': 'manager',
                            'type': 'list',
                            'message': 'Who is the manager of the new employee?',
                            'choices': managers
                        }
                    ])
                    query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)', firstName, lastName, role, manager);
                    newMainChoice();
                })
            });
            break;
        case 'Update Employee Role':
            db.execute('SELECT * FROM employee', (err, results) => {
                if (err) {
                    console.log(err);
                    return;
                }
                const employees = results.map(employee => {
                    return {
                        name: `${employee.first_name} ${employee.last_name}`,
                        value: employee.id
                    }
                })
                db.execute('SELECT * FROM role', async (err, results) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    const roles = results.map(role => {
                        return {
                            name: role.title,
                            value: role.id
                        }
                    })
                    const { employee, role } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'employee',
                            message: 'Which employee would you like to update?',
                            choices: employees
                        },
                        {
                            type: 'list',
                            name: 'role',
                            message: 'What is the new role for the employee?',
                            choices: roles
                        }
                    ])
                    query('UPDATE employee SET role_id = ? WHERE id = ?', role, employee);
                    newMainChoice();
                });
            })
            break;
        case 'Quit':
            db.end();
            break;
    }
}

mainChoice();