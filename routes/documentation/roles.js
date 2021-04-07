/** 
 *  @swagger
 *   components:
 *     schemas:
 *       Roles:
 *         type: object
 *         required:
 *           - name
 *         properties:
 *           _id:
 *             type: string
 *             description: The auto-generated id of the roles.
 *           name:
 *             type: string
 *             description: The name of your roles.
 *           desc:
 *             type: string
 *             description: description of your roles
 *         example:
 *            name: superadmin
 *            desc: super admin
 *
 * @swagger
 *  tags: 
 *    name: Roles
 *    description: API to manage your roles
 */

/**
 * @swagger
 *  paths:
 *    /roles:
 *      get:
 *        summary: List of all roles
 *        tags: [Roles]
 *        parameters:
 *          - in: query
 *            name: where
 *            schema:
 *              type: string
 *            description: query where
 *          - in: query
 *            name: limit
 *            schema: 
 *              type: integer
 *            description: query limit for limiting item to return 
 *          - in: query
 *            name: offset
 *            schema: 
 *              type: integer
 *            description: query skip to skipping before starting collect the results set
 *          - in: query
 *            name: sort
 *            schema:
 *              type: string
 *            description: query sort for sorting ascending or descending
 *        responses:
 *          200:
 *            description: Ok.
 *            content:
 *              aplication/json:
 *                schema:
 *                  $ref: '#/components/schemas/Roles'
 *      post:
 *        summary: Creates a new roles
 *        tags: [Roles]
 *        requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Roles' 
 *        responses:
 *          200:
 *            description: Ok
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Roles'
 *      put:
 *        summary: Update roles where query
 *        tags: [Roles]
 *        parameters:
 *          - in: query
 *            name: where
 *            schema: 
 *              type: string
 *            description: roles request query params
 *        requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/Roles"
 *        responses:
 *          204:
 *            description: Ok
 *          400:
 *            description: roles not found
 *      delete:
 *        summary: Delete roles where query
 *        tags: [Roles]
 *        parameters:
 *          - in: query
 *            name: where
 *            schema: 
 *              type: string
 *            description: roles request query params
 *        responses:
 *          200:  
 *            description: Ok
 *          400:
 *            description: roles not found 
 *    /roles/count:
 *      get:
 *        summary: Count all roles where query
 *        tags: [Roles]
 *        parameters:
 *          - in: query
 *            name: where
 *            schema:
 *              type: string
 *            derscription: roles request query params
 *        responses:
 *          200:
 *            description: Ok  
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Roles'
 *    /roles/{id}:
 *      get:
 *        summary: get roles by id
 *        tags: [Roles]
 *        parameters:
 *          - in: path
 *            name: id
 *            description: roles id
 *            schema:
 *              type: integer
 *        responses:
 *          200:
 *            description: Ok
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Roles'
 *      put:
 *        summary: update roles by id
 *        tags: [Roles]
 *        parameters:
 *          - in: path
 *            name: id
 *            description: roles id
 *            schema:
 *              type: integer
 *        requestBody:
 *          required: true
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Roles'
 *        responses:
 *          200:
 *            description: Ok
 *            content:
 *              application/json:
 *                schema:
 *                  $ref: '#/components/schemas/Roles'
 *          400:
 *            description: roles not found
 *      delete:
 *        summary: delete roles by id
 *        tags: [Roles]
 *        parameters:
 *          - in: path
 *            name: id
 *            description: roles id
 *            schema:
 *              type: integer
 *        responses:
 *          200:
 *            description: Ok
 *          400:
 *            description: roles not found
 */