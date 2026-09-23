#include <iostream>
#include <string>
using namespace std;

const int MAXIMO = 100;

void capturar(string cadenas[], int &cantidad)
{
    do
    {
        cout << "Cuantas cadenas desea capturar (1 a 100): ";
        cin >> cantidad;
        if (cantidad < 1 || cantidad > MAXIMO)
        {
            cout << "La cantidad debe estar entre 1 y 100." << endl;
        }
    } while (cantidad < 1 || cantidad > MAXIMO);

    for (int i = 0; i < cantidad; i++)
    {
        bool repetida;
        do
        {
            repetida = false;
            cout << "Capture la cadena " << i + 1 << ": ";
            cin >> cadenas[i];

            for (int j = 0; j < i; j++)
            {
                if (cadenas[i] == cadenas[j])
                {
                    repetida = true;
                    cout << "Esa cadena ya fue capturada. Ingrese una diferente." << endl;
                    break;
                }
            }
        } while (repetida);
    }
}

void ordenar(string cadenas[], int cantidad)
{
    for (int i = 0; i < cantidad - 1; i++)
    {
        for (int j = 0; j < cantidad - i - 1; j++)
        {
            if (cadenas[j] > cadenas[j + 1])
            {
                string auxiliar = cadenas[j];
                cadenas[j] = cadenas[j + 1];
                cadenas[j + 1] = auxiliar;
            }
        }
    }
}

void ordenarCaracteres(string cadenas[], int cantidad)
{
    for (int i = 0; i < cantidad; i++)
    {
        for (int j = 0; j < static_cast<int>(cadenas[i].length()) - 1; j++)
        {
            for (int k = 0; k < static_cast<int>(cadenas[i].length()) - j - 1; k++)
            {
                if (cadenas[i][k] > cadenas[i][k + 1])
                {
                    char auxiliar = cadenas[i][k];
                    cadenas[i][k] = cadenas[i][k + 1];
                    cadenas[i][k + 1] = auxiliar;
                }
            }
        }
    }
}

void imprimir(const string cadenas[], int cantidad)
{
    if (cantidad == 0)
    {
        cout << "No hay elementos capturados." << endl;
        return;
    }

    cout << "Cadenas: ";
    for (int i = 0; i < cantidad; i++)
    {
        cout << cadenas[i] << " ";
    }
    cout << endl;
}

int busquedaSecuencial(const string cadenas[], int cantidad, const string &buscado)
{
    for (int i = 0; i < cantidad; i++)
    {
        if (cadenas[i] == buscado)
        {
            return i;
        }
    }
    return -1;
}

int busquedaBinaria(const string &cadena, char buscado)
{
    int inicio = 0;
    int fin = static_cast<int>(cadena.length()) - 1;

    while (inicio <= fin)
    {
        int medio = inicio + (fin - inicio) / 2;

        if (cadena[medio] == buscado)
        {
            return medio;
        }
        if (cadena[medio] < buscado)
        {
            inicio = medio + 1;
        }
        else
        {
            fin = medio - 1;
        }
    }
    return -1;
}

int main()
{
    string cadenas[MAXIMO];
    int cantidad = 0;
    int opcion;

    do
    {
        cout << "\nESTE ES EL MENU" << endl;
        cout << "1. Capturar la cadena" << endl;
        cout << "2. Ordenamiento de la cadena" << endl;
        cout << "3. Imprimir" << endl;
        cout << "4. Busqueda secuencial" << endl;
        cout << "5. Busqueda binaria" << endl;
        cout << "6. Salir" << endl;
        cout << "Seleccione una opcion: ";
        cin >> opcion;

        switch (opcion)
        {
        case 1:
            capturar(cadenas, cantidad);
            break;
        case 2:
            if (cantidad == 0)
            {
                cout << "Primero capture la cadena." << endl;
            }
            else
            {
                ordenarCaracteres(cadenas, cantidad);
                cout << "Cadena ordenada correctamente." << endl;
            }
            break;
        case 3:
            if (cantidad > 0)
            {
                ordenarCaracteres(cadenas, cantidad);
            }
            imprimir(cadenas, cantidad);
            break;
        case 4:
        {
            string buscado;
            cout << "Cadena que desea buscar: ";
            cin >> buscado;
            int posicion = busquedaSecuencial(cadenas, cantidad, buscado);
            if (posicion == -1)
            {
                cout << "El valor no se encuentra." << endl;
            }
            else
            {
                cout << "Valor encontrado en la posicion " << posicion << "." << endl;
            }
            break;
        }
        case 5:
        {
            char buscado;
            if (cantidad == 0)
            {
                cout << "Primero capture la cadena." << endl;
                break;
            }
            ordenarCaracteres(cadenas, cantidad);
            cout << "Numero que desea buscar: ";
            cin >> buscado;

            bool encontrado = false;
            for (int i = 0; i < cantidad; i++)
            {
                int posicion = busquedaBinaria(cadenas[i], buscado);
                if (posicion != -1)
                {
                    cout << "Numero encontrado en la cadena " << i + 1
                         << ", posicion " << posicion << "." << endl;
                    encontrado = true;
                }
            }

            if (!encontrado)
            {
                cout << "El numero no se encuentra." << endl;
            }
            break;
        }
        case 6:
            cout << "Programa finalizado." << endl;
            break;
        default:
            cout << "Opcion no valida." << endl;
        }
    } while (opcion != 6);

    return 0;
}
