
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model employees
 * 
 */
export type employees = $Result.DefaultSelection<Prisma.$employeesPayload>
/**
 * Model departments
 * 
 */
export type departments = $Result.DefaultSelection<Prisma.$departmentsPayload>
/**
 * Model job_positions
 * 
 */
export type job_positions = $Result.DefaultSelection<Prisma.$job_positionsPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Employees
 * const employees = await prisma.employees.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Employees
   * const employees = await prisma.employees.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.employees`: Exposes CRUD operations for the **employees** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Employees
    * const employees = await prisma.employees.findMany()
    * ```
    */
  get employees(): Prisma.employeesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.departments`: Exposes CRUD operations for the **departments** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Departments
    * const departments = await prisma.departments.findMany()
    * ```
    */
  get departments(): Prisma.departmentsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.job_positions`: Exposes CRUD operations for the **job_positions** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Job_positions
    * const job_positions = await prisma.job_positions.findMany()
    * ```
    */
  get job_positions(): Prisma.job_positionsDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    employees: 'employees',
    departments: 'departments',
    job_positions: 'job_positions'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "employees" | "departments" | "job_positions"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      employees: {
        payload: Prisma.$employeesPayload<ExtArgs>
        fields: Prisma.employeesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.employeesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.employeesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          findFirst: {
            args: Prisma.employeesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.employeesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          findMany: {
            args: Prisma.employeesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>[]
          }
          create: {
            args: Prisma.employeesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          createMany: {
            args: Prisma.employeesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.employeesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>[]
          }
          delete: {
            args: Prisma.employeesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          update: {
            args: Prisma.employeesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          deleteMany: {
            args: Prisma.employeesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.employeesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.employeesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>[]
          }
          upsert: {
            args: Prisma.employeesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$employeesPayload>
          }
          aggregate: {
            args: Prisma.EmployeesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmployees>
          }
          groupBy: {
            args: Prisma.employeesGroupByArgs<ExtArgs>
            result: $Utils.Optional<EmployeesGroupByOutputType>[]
          }
          count: {
            args: Prisma.employeesCountArgs<ExtArgs>
            result: $Utils.Optional<EmployeesCountAggregateOutputType> | number
          }
        }
      }
      departments: {
        payload: Prisma.$departmentsPayload<ExtArgs>
        fields: Prisma.departmentsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.departmentsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.departmentsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          findFirst: {
            args: Prisma.departmentsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.departmentsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          findMany: {
            args: Prisma.departmentsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>[]
          }
          create: {
            args: Prisma.departmentsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          createMany: {
            args: Prisma.departmentsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.departmentsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>[]
          }
          delete: {
            args: Prisma.departmentsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          update: {
            args: Prisma.departmentsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          deleteMany: {
            args: Prisma.departmentsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.departmentsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.departmentsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>[]
          }
          upsert: {
            args: Prisma.departmentsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$departmentsPayload>
          }
          aggregate: {
            args: Prisma.DepartmentsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDepartments>
          }
          groupBy: {
            args: Prisma.departmentsGroupByArgs<ExtArgs>
            result: $Utils.Optional<DepartmentsGroupByOutputType>[]
          }
          count: {
            args: Prisma.departmentsCountArgs<ExtArgs>
            result: $Utils.Optional<DepartmentsCountAggregateOutputType> | number
          }
        }
      }
      job_positions: {
        payload: Prisma.$job_positionsPayload<ExtArgs>
        fields: Prisma.job_positionsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.job_positionsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.job_positionsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          findFirst: {
            args: Prisma.job_positionsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.job_positionsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          findMany: {
            args: Prisma.job_positionsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>[]
          }
          create: {
            args: Prisma.job_positionsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          createMany: {
            args: Prisma.job_positionsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.job_positionsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>[]
          }
          delete: {
            args: Prisma.job_positionsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          update: {
            args: Prisma.job_positionsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          deleteMany: {
            args: Prisma.job_positionsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.job_positionsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.job_positionsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>[]
          }
          upsert: {
            args: Prisma.job_positionsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$job_positionsPayload>
          }
          aggregate: {
            args: Prisma.Job_positionsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateJob_positions>
          }
          groupBy: {
            args: Prisma.job_positionsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Job_positionsGroupByOutputType>[]
          }
          count: {
            args: Prisma.job_positionsCountArgs<ExtArgs>
            result: $Utils.Optional<Job_positionsCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    employees?: employeesOmit
    departments?: departmentsOmit
    job_positions?: job_positionsOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type EmployeesCountOutputType
   */

  export type EmployeesCountOutputType = {
    subordinates: number
    secondary_subordinates: number
  }

  export type EmployeesCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subordinates?: boolean | EmployeesCountOutputTypeCountSubordinatesArgs
    secondary_subordinates?: boolean | EmployeesCountOutputTypeCountSecondary_subordinatesArgs
  }

  // Custom InputTypes
  /**
   * EmployeesCountOutputType without action
   */
  export type EmployeesCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeesCountOutputType
     */
    select?: EmployeesCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EmployeesCountOutputType without action
   */
  export type EmployeesCountOutputTypeCountSubordinatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: employeesWhereInput
  }

  /**
   * EmployeesCountOutputType without action
   */
  export type EmployeesCountOutputTypeCountSecondary_subordinatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: employeesWhereInput
  }


  /**
   * Count Type DepartmentsCountOutputType
   */

  export type DepartmentsCountOutputType = {
    employees: number
    job_positions: number
  }

  export type DepartmentsCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employees?: boolean | DepartmentsCountOutputTypeCountEmployeesArgs
    job_positions?: boolean | DepartmentsCountOutputTypeCountJob_positionsArgs
  }

  // Custom InputTypes
  /**
   * DepartmentsCountOutputType without action
   */
  export type DepartmentsCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DepartmentsCountOutputType
     */
    select?: DepartmentsCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * DepartmentsCountOutputType without action
   */
  export type DepartmentsCountOutputTypeCountEmployeesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: employeesWhereInput
  }

  /**
   * DepartmentsCountOutputType without action
   */
  export type DepartmentsCountOutputTypeCountJob_positionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: job_positionsWhereInput
  }


  /**
   * Count Type Job_positionsCountOutputType
   */

  export type Job_positionsCountOutputType = {
    employees: number
    children: number
  }

  export type Job_positionsCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employees?: boolean | Job_positionsCountOutputTypeCountEmployeesArgs
    children?: boolean | Job_positionsCountOutputTypeCountChildrenArgs
  }

  // Custom InputTypes
  /**
   * Job_positionsCountOutputType without action
   */
  export type Job_positionsCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Job_positionsCountOutputType
     */
    select?: Job_positionsCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Job_positionsCountOutputType without action
   */
  export type Job_positionsCountOutputTypeCountEmployeesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: employeesWhereInput
  }

  /**
   * Job_positionsCountOutputType without action
   */
  export type Job_positionsCountOutputTypeCountChildrenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: job_positionsWhereInput
  }


  /**
   * Models
   */

  /**
   * Model employees
   */

  export type AggregateEmployees = {
    _count: EmployeesCountAggregateOutputType | null
    _avg: EmployeesAvgAggregateOutputType | null
    _sum: EmployeesSumAggregateOutputType | null
    _min: EmployeesMinAggregateOutputType | null
    _max: EmployeesMaxAggregateOutputType | null
  }

  export type EmployeesAvgAggregateOutputType = {
    department_id: number | null
    job_position_id: number | null
    base_salary: Decimal | null
    position_allowance: Decimal | null
  }

  export type EmployeesSumAggregateOutputType = {
    department_id: number | null
    job_position_id: number | null
    base_salary: Decimal | null
    position_allowance: Decimal | null
  }

  export type EmployeesMinAggregateOutputType = {
    emp_id: string | null
    name: string | null
    nickname: string | null
    pin_hash: string | null
    is_active: boolean | null
    department_id: number | null
    job_position_id: number | null
    supervisor_id: string | null
    secondary_supervisor_id: string | null
    phone_number: string | null
    email: string | null
    branch_id: string | null
    gender: string | null
    hire_date: Date | null
    birth_date: Date | null
    base_salary: Decimal | null
    otp_code: string | null
    otp_expires_at: Date | null
    bank_account_no: string | null
    bank_name: string | null
    is_on_trial: boolean | null
    has_telephone_allowance: boolean | null
    position_allowance: Decimal | null
    address: string | null
    national_id_card: string | null
    salary_type: string | null
    line_user_id: string | null
    is_checkin_exempt: boolean | null
    probation_end_date: Date | null
    resignation_date: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type EmployeesMaxAggregateOutputType = {
    emp_id: string | null
    name: string | null
    nickname: string | null
    pin_hash: string | null
    is_active: boolean | null
    department_id: number | null
    job_position_id: number | null
    supervisor_id: string | null
    secondary_supervisor_id: string | null
    phone_number: string | null
    email: string | null
    branch_id: string | null
    gender: string | null
    hire_date: Date | null
    birth_date: Date | null
    base_salary: Decimal | null
    otp_code: string | null
    otp_expires_at: Date | null
    bank_account_no: string | null
    bank_name: string | null
    is_on_trial: boolean | null
    has_telephone_allowance: boolean | null
    position_allowance: Decimal | null
    address: string | null
    national_id_card: string | null
    salary_type: string | null
    line_user_id: string | null
    is_checkin_exempt: boolean | null
    probation_end_date: Date | null
    resignation_date: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type EmployeesCountAggregateOutputType = {
    emp_id: number
    name: number
    nickname: number
    pin_hash: number
    is_active: number
    department_id: number
    job_position_id: number
    supervisor_id: number
    secondary_supervisor_id: number
    phone_number: number
    email: number
    branch_id: number
    gender: number
    hire_date: number
    birth_date: number
    base_salary: number
    otp_code: number
    otp_expires_at: number
    bank_account_no: number
    bank_name: number
    is_on_trial: number
    has_telephone_allowance: number
    position_allowance: number
    address: number
    national_id_card: number
    salary_type: number
    line_user_id: number
    is_checkin_exempt: number
    probation_end_date: number
    resignation_date: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type EmployeesAvgAggregateInputType = {
    department_id?: true
    job_position_id?: true
    base_salary?: true
    position_allowance?: true
  }

  export type EmployeesSumAggregateInputType = {
    department_id?: true
    job_position_id?: true
    base_salary?: true
    position_allowance?: true
  }

  export type EmployeesMinAggregateInputType = {
    emp_id?: true
    name?: true
    nickname?: true
    pin_hash?: true
    is_active?: true
    department_id?: true
    job_position_id?: true
    supervisor_id?: true
    secondary_supervisor_id?: true
    phone_number?: true
    email?: true
    branch_id?: true
    gender?: true
    hire_date?: true
    birth_date?: true
    base_salary?: true
    otp_code?: true
    otp_expires_at?: true
    bank_account_no?: true
    bank_name?: true
    is_on_trial?: true
    has_telephone_allowance?: true
    position_allowance?: true
    address?: true
    national_id_card?: true
    salary_type?: true
    line_user_id?: true
    is_checkin_exempt?: true
    probation_end_date?: true
    resignation_date?: true
    created_at?: true
    updated_at?: true
  }

  export type EmployeesMaxAggregateInputType = {
    emp_id?: true
    name?: true
    nickname?: true
    pin_hash?: true
    is_active?: true
    department_id?: true
    job_position_id?: true
    supervisor_id?: true
    secondary_supervisor_id?: true
    phone_number?: true
    email?: true
    branch_id?: true
    gender?: true
    hire_date?: true
    birth_date?: true
    base_salary?: true
    otp_code?: true
    otp_expires_at?: true
    bank_account_no?: true
    bank_name?: true
    is_on_trial?: true
    has_telephone_allowance?: true
    position_allowance?: true
    address?: true
    national_id_card?: true
    salary_type?: true
    line_user_id?: true
    is_checkin_exempt?: true
    probation_end_date?: true
    resignation_date?: true
    created_at?: true
    updated_at?: true
  }

  export type EmployeesCountAggregateInputType = {
    emp_id?: true
    name?: true
    nickname?: true
    pin_hash?: true
    is_active?: true
    department_id?: true
    job_position_id?: true
    supervisor_id?: true
    secondary_supervisor_id?: true
    phone_number?: true
    email?: true
    branch_id?: true
    gender?: true
    hire_date?: true
    birth_date?: true
    base_salary?: true
    otp_code?: true
    otp_expires_at?: true
    bank_account_no?: true
    bank_name?: true
    is_on_trial?: true
    has_telephone_allowance?: true
    position_allowance?: true
    address?: true
    national_id_card?: true
    salary_type?: true
    line_user_id?: true
    is_checkin_exempt?: true
    probation_end_date?: true
    resignation_date?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type EmployeesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which employees to aggregate.
     */
    where?: employeesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of employees to fetch.
     */
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: employeesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned employees
    **/
    _count?: true | EmployeesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EmployeesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EmployeesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EmployeesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EmployeesMaxAggregateInputType
  }

  export type GetEmployeesAggregateType<T extends EmployeesAggregateArgs> = {
        [P in keyof T & keyof AggregateEmployees]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmployees[P]>
      : GetScalarType<T[P], AggregateEmployees[P]>
  }




  export type employeesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: employeesWhereInput
    orderBy?: employeesOrderByWithAggregationInput | employeesOrderByWithAggregationInput[]
    by: EmployeesScalarFieldEnum[] | EmployeesScalarFieldEnum
    having?: employeesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EmployeesCountAggregateInputType | true
    _avg?: EmployeesAvgAggregateInputType
    _sum?: EmployeesSumAggregateInputType
    _min?: EmployeesMinAggregateInputType
    _max?: EmployeesMaxAggregateInputType
  }

  export type EmployeesGroupByOutputType = {
    emp_id: string
    name: string
    nickname: string | null
    pin_hash: string | null
    is_active: boolean
    department_id: number | null
    job_position_id: number | null
    supervisor_id: string | null
    secondary_supervisor_id: string | null
    phone_number: string | null
    email: string | null
    branch_id: string | null
    gender: string | null
    hire_date: Date | null
    birth_date: Date | null
    base_salary: Decimal | null
    otp_code: string | null
    otp_expires_at: Date | null
    bank_account_no: string | null
    bank_name: string | null
    is_on_trial: boolean | null
    has_telephone_allowance: boolean | null
    position_allowance: Decimal | null
    address: string | null
    national_id_card: string | null
    salary_type: string | null
    line_user_id: string | null
    is_checkin_exempt: boolean | null
    probation_end_date: Date | null
    resignation_date: Date | null
    created_at: Date | null
    updated_at: Date | null
    _count: EmployeesCountAggregateOutputType | null
    _avg: EmployeesAvgAggregateOutputType | null
    _sum: EmployeesSumAggregateOutputType | null
    _min: EmployeesMinAggregateOutputType | null
    _max: EmployeesMaxAggregateOutputType | null
  }

  type GetEmployeesGroupByPayload<T extends employeesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EmployeesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EmployeesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EmployeesGroupByOutputType[P]>
            : GetScalarType<T[P], EmployeesGroupByOutputType[P]>
        }
      >
    >


  export type employeesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    emp_id?: boolean
    name?: boolean
    nickname?: boolean
    pin_hash?: boolean
    is_active?: boolean
    department_id?: boolean
    job_position_id?: boolean
    supervisor_id?: boolean
    secondary_supervisor_id?: boolean
    phone_number?: boolean
    email?: boolean
    branch_id?: boolean
    gender?: boolean
    hire_date?: boolean
    birth_date?: boolean
    base_salary?: boolean
    otp_code?: boolean
    otp_expires_at?: boolean
    bank_account_no?: boolean
    bank_name?: boolean
    is_on_trial?: boolean
    has_telephone_allowance?: boolean
    position_allowance?: boolean
    address?: boolean
    national_id_card?: boolean
    salary_type?: boolean
    line_user_id?: boolean
    is_checkin_exempt?: boolean
    probation_end_date?: boolean
    resignation_date?: boolean
    created_at?: boolean
    updated_at?: boolean
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    subordinates?: boolean | employees$subordinatesArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
    secondary_subordinates?: boolean | employees$secondary_subordinatesArgs<ExtArgs>
    _count?: boolean | EmployeesCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["employees"]>

  export type employeesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    emp_id?: boolean
    name?: boolean
    nickname?: boolean
    pin_hash?: boolean
    is_active?: boolean
    department_id?: boolean
    job_position_id?: boolean
    supervisor_id?: boolean
    secondary_supervisor_id?: boolean
    phone_number?: boolean
    email?: boolean
    branch_id?: boolean
    gender?: boolean
    hire_date?: boolean
    birth_date?: boolean
    base_salary?: boolean
    otp_code?: boolean
    otp_expires_at?: boolean
    bank_account_no?: boolean
    bank_name?: boolean
    is_on_trial?: boolean
    has_telephone_allowance?: boolean
    position_allowance?: boolean
    address?: boolean
    national_id_card?: boolean
    salary_type?: boolean
    line_user_id?: boolean
    is_checkin_exempt?: boolean
    probation_end_date?: boolean
    resignation_date?: boolean
    created_at?: boolean
    updated_at?: boolean
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
  }, ExtArgs["result"]["employees"]>

  export type employeesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    emp_id?: boolean
    name?: boolean
    nickname?: boolean
    pin_hash?: boolean
    is_active?: boolean
    department_id?: boolean
    job_position_id?: boolean
    supervisor_id?: boolean
    secondary_supervisor_id?: boolean
    phone_number?: boolean
    email?: boolean
    branch_id?: boolean
    gender?: boolean
    hire_date?: boolean
    birth_date?: boolean
    base_salary?: boolean
    otp_code?: boolean
    otp_expires_at?: boolean
    bank_account_no?: boolean
    bank_name?: boolean
    is_on_trial?: boolean
    has_telephone_allowance?: boolean
    position_allowance?: boolean
    address?: boolean
    national_id_card?: boolean
    salary_type?: boolean
    line_user_id?: boolean
    is_checkin_exempt?: boolean
    probation_end_date?: boolean
    resignation_date?: boolean
    created_at?: boolean
    updated_at?: boolean
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
  }, ExtArgs["result"]["employees"]>

  export type employeesSelectScalar = {
    emp_id?: boolean
    name?: boolean
    nickname?: boolean
    pin_hash?: boolean
    is_active?: boolean
    department_id?: boolean
    job_position_id?: boolean
    supervisor_id?: boolean
    secondary_supervisor_id?: boolean
    phone_number?: boolean
    email?: boolean
    branch_id?: boolean
    gender?: boolean
    hire_date?: boolean
    birth_date?: boolean
    base_salary?: boolean
    otp_code?: boolean
    otp_expires_at?: boolean
    bank_account_no?: boolean
    bank_name?: boolean
    is_on_trial?: boolean
    has_telephone_allowance?: boolean
    position_allowance?: boolean
    address?: boolean
    national_id_card?: boolean
    salary_type?: boolean
    line_user_id?: boolean
    is_checkin_exempt?: boolean
    probation_end_date?: boolean
    resignation_date?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type employeesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"emp_id" | "name" | "nickname" | "pin_hash" | "is_active" | "department_id" | "job_position_id" | "supervisor_id" | "secondary_supervisor_id" | "phone_number" | "email" | "branch_id" | "gender" | "hire_date" | "birth_date" | "base_salary" | "otp_code" | "otp_expires_at" | "bank_account_no" | "bank_name" | "is_on_trial" | "has_telephone_allowance" | "position_allowance" | "address" | "national_id_card" | "salary_type" | "line_user_id" | "is_checkin_exempt" | "probation_end_date" | "resignation_date" | "created_at" | "updated_at", ExtArgs["result"]["employees"]>
  export type employeesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    subordinates?: boolean | employees$subordinatesArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
    secondary_subordinates?: boolean | employees$secondary_subordinatesArgs<ExtArgs>
    _count?: boolean | EmployeesCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type employeesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
  }
  export type employeesIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    departments?: boolean | employees$departmentsArgs<ExtArgs>
    job_positions?: boolean | employees$job_positionsArgs<ExtArgs>
    supervisor?: boolean | employees$supervisorArgs<ExtArgs>
    secondary_supervisor?: boolean | employees$secondary_supervisorArgs<ExtArgs>
  }

  export type $employeesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "employees"
    objects: {
      departments: Prisma.$departmentsPayload<ExtArgs> | null
      job_positions: Prisma.$job_positionsPayload<ExtArgs> | null
      supervisor: Prisma.$employeesPayload<ExtArgs> | null
      subordinates: Prisma.$employeesPayload<ExtArgs>[]
      secondary_supervisor: Prisma.$employeesPayload<ExtArgs> | null
      secondary_subordinates: Prisma.$employeesPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      emp_id: string
      name: string
      nickname: string | null
      pin_hash: string | null
      is_active: boolean
      department_id: number | null
      job_position_id: number | null
      supervisor_id: string | null
      secondary_supervisor_id: string | null
      phone_number: string | null
      email: string | null
      branch_id: string | null
      gender: string | null
      hire_date: Date | null
      birth_date: Date | null
      base_salary: Prisma.Decimal | null
      otp_code: string | null
      otp_expires_at: Date | null
      bank_account_no: string | null
      bank_name: string | null
      is_on_trial: boolean | null
      has_telephone_allowance: boolean | null
      position_allowance: Prisma.Decimal | null
      address: string | null
      national_id_card: string | null
      salary_type: string | null
      line_user_id: string | null
      is_checkin_exempt: boolean | null
      probation_end_date: Date | null
      resignation_date: Date | null
      created_at: Date | null
      updated_at: Date | null
    }, ExtArgs["result"]["employees"]>
    composites: {}
  }

  type employeesGetPayload<S extends boolean | null | undefined | employeesDefaultArgs> = $Result.GetResult<Prisma.$employeesPayload, S>

  type employeesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<employeesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EmployeesCountAggregateInputType | true
    }

  export interface employeesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['employees'], meta: { name: 'employees' } }
    /**
     * Find zero or one Employees that matches the filter.
     * @param {employeesFindUniqueArgs} args - Arguments to find a Employees
     * @example
     * // Get one Employees
     * const employees = await prisma.employees.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends employeesFindUniqueArgs>(args: SelectSubset<T, employeesFindUniqueArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Employees that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {employeesFindUniqueOrThrowArgs} args - Arguments to find a Employees
     * @example
     * // Get one Employees
     * const employees = await prisma.employees.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends employeesFindUniqueOrThrowArgs>(args: SelectSubset<T, employeesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Employees that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesFindFirstArgs} args - Arguments to find a Employees
     * @example
     * // Get one Employees
     * const employees = await prisma.employees.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends employeesFindFirstArgs>(args?: SelectSubset<T, employeesFindFirstArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Employees that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesFindFirstOrThrowArgs} args - Arguments to find a Employees
     * @example
     * // Get one Employees
     * const employees = await prisma.employees.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends employeesFindFirstOrThrowArgs>(args?: SelectSubset<T, employeesFindFirstOrThrowArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Employees that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Employees
     * const employees = await prisma.employees.findMany()
     * 
     * // Get first 10 Employees
     * const employees = await prisma.employees.findMany({ take: 10 })
     * 
     * // Only select the `emp_id`
     * const employeesWithEmp_idOnly = await prisma.employees.findMany({ select: { emp_id: true } })
     * 
     */
    findMany<T extends employeesFindManyArgs>(args?: SelectSubset<T, employeesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Employees.
     * @param {employeesCreateArgs} args - Arguments to create a Employees.
     * @example
     * // Create one Employees
     * const Employees = await prisma.employees.create({
     *   data: {
     *     // ... data to create a Employees
     *   }
     * })
     * 
     */
    create<T extends employeesCreateArgs>(args: SelectSubset<T, employeesCreateArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Employees.
     * @param {employeesCreateManyArgs} args - Arguments to create many Employees.
     * @example
     * // Create many Employees
     * const employees = await prisma.employees.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends employeesCreateManyArgs>(args?: SelectSubset<T, employeesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Employees and returns the data saved in the database.
     * @param {employeesCreateManyAndReturnArgs} args - Arguments to create many Employees.
     * @example
     * // Create many Employees
     * const employees = await prisma.employees.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Employees and only return the `emp_id`
     * const employeesWithEmp_idOnly = await prisma.employees.createManyAndReturn({
     *   select: { emp_id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends employeesCreateManyAndReturnArgs>(args?: SelectSubset<T, employeesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Employees.
     * @param {employeesDeleteArgs} args - Arguments to delete one Employees.
     * @example
     * // Delete one Employees
     * const Employees = await prisma.employees.delete({
     *   where: {
     *     // ... filter to delete one Employees
     *   }
     * })
     * 
     */
    delete<T extends employeesDeleteArgs>(args: SelectSubset<T, employeesDeleteArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Employees.
     * @param {employeesUpdateArgs} args - Arguments to update one Employees.
     * @example
     * // Update one Employees
     * const employees = await prisma.employees.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends employeesUpdateArgs>(args: SelectSubset<T, employeesUpdateArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Employees.
     * @param {employeesDeleteManyArgs} args - Arguments to filter Employees to delete.
     * @example
     * // Delete a few Employees
     * const { count } = await prisma.employees.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends employeesDeleteManyArgs>(args?: SelectSubset<T, employeesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Employees
     * const employees = await prisma.employees.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends employeesUpdateManyArgs>(args: SelectSubset<T, employeesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Employees and returns the data updated in the database.
     * @param {employeesUpdateManyAndReturnArgs} args - Arguments to update many Employees.
     * @example
     * // Update many Employees
     * const employees = await prisma.employees.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Employees and only return the `emp_id`
     * const employeesWithEmp_idOnly = await prisma.employees.updateManyAndReturn({
     *   select: { emp_id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends employeesUpdateManyAndReturnArgs>(args: SelectSubset<T, employeesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Employees.
     * @param {employeesUpsertArgs} args - Arguments to update or create a Employees.
     * @example
     * // Update or create a Employees
     * const employees = await prisma.employees.upsert({
     *   create: {
     *     // ... data to create a Employees
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Employees we want to update
     *   }
     * })
     */
    upsert<T extends employeesUpsertArgs>(args: SelectSubset<T, employeesUpsertArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesCountArgs} args - Arguments to filter Employees to count.
     * @example
     * // Count the number of Employees
     * const count = await prisma.employees.count({
     *   where: {
     *     // ... the filter for the Employees we want to count
     *   }
     * })
    **/
    count<T extends employeesCountArgs>(
      args?: Subset<T, employeesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EmployeesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EmployeesAggregateArgs>(args: Subset<T, EmployeesAggregateArgs>): Prisma.PrismaPromise<GetEmployeesAggregateType<T>>

    /**
     * Group by Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {employeesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends employeesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: employeesGroupByArgs['orderBy'] }
        : { orderBy?: employeesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, employeesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmployeesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the employees model
   */
  readonly fields: employeesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for employees.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__employeesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    departments<T extends employees$departmentsArgs<ExtArgs> = {}>(args?: Subset<T, employees$departmentsArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    job_positions<T extends employees$job_positionsArgs<ExtArgs> = {}>(args?: Subset<T, employees$job_positionsArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    supervisor<T extends employees$supervisorArgs<ExtArgs> = {}>(args?: Subset<T, employees$supervisorArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    subordinates<T extends employees$subordinatesArgs<ExtArgs> = {}>(args?: Subset<T, employees$subordinatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    secondary_supervisor<T extends employees$secondary_supervisorArgs<ExtArgs> = {}>(args?: Subset<T, employees$secondary_supervisorArgs<ExtArgs>>): Prisma__employeesClient<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    secondary_subordinates<T extends employees$secondary_subordinatesArgs<ExtArgs> = {}>(args?: Subset<T, employees$secondary_subordinatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the employees model
   */
  interface employeesFieldRefs {
    readonly emp_id: FieldRef<"employees", 'String'>
    readonly name: FieldRef<"employees", 'String'>
    readonly nickname: FieldRef<"employees", 'String'>
    readonly pin_hash: FieldRef<"employees", 'String'>
    readonly is_active: FieldRef<"employees", 'Boolean'>
    readonly department_id: FieldRef<"employees", 'Int'>
    readonly job_position_id: FieldRef<"employees", 'Int'>
    readonly supervisor_id: FieldRef<"employees", 'String'>
    readonly secondary_supervisor_id: FieldRef<"employees", 'String'>
    readonly phone_number: FieldRef<"employees", 'String'>
    readonly email: FieldRef<"employees", 'String'>
    readonly branch_id: FieldRef<"employees", 'String'>
    readonly gender: FieldRef<"employees", 'String'>
    readonly hire_date: FieldRef<"employees", 'DateTime'>
    readonly birth_date: FieldRef<"employees", 'DateTime'>
    readonly base_salary: FieldRef<"employees", 'Decimal'>
    readonly otp_code: FieldRef<"employees", 'String'>
    readonly otp_expires_at: FieldRef<"employees", 'DateTime'>
    readonly bank_account_no: FieldRef<"employees", 'String'>
    readonly bank_name: FieldRef<"employees", 'String'>
    readonly is_on_trial: FieldRef<"employees", 'Boolean'>
    readonly has_telephone_allowance: FieldRef<"employees", 'Boolean'>
    readonly position_allowance: FieldRef<"employees", 'Decimal'>
    readonly address: FieldRef<"employees", 'String'>
    readonly national_id_card: FieldRef<"employees", 'String'>
    readonly salary_type: FieldRef<"employees", 'String'>
    readonly line_user_id: FieldRef<"employees", 'String'>
    readonly is_checkin_exempt: FieldRef<"employees", 'Boolean'>
    readonly probation_end_date: FieldRef<"employees", 'DateTime'>
    readonly resignation_date: FieldRef<"employees", 'DateTime'>
    readonly created_at: FieldRef<"employees", 'DateTime'>
    readonly updated_at: FieldRef<"employees", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * employees findUnique
   */
  export type employeesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter, which employees to fetch.
     */
    where: employeesWhereUniqueInput
  }

  /**
   * employees findUniqueOrThrow
   */
  export type employeesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter, which employees to fetch.
     */
    where: employeesWhereUniqueInput
  }

  /**
   * employees findFirst
   */
  export type employeesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter, which employees to fetch.
     */
    where?: employeesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of employees to fetch.
     */
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for employees.
     */
    cursor?: employeesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of employees.
     */
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * employees findFirstOrThrow
   */
  export type employeesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter, which employees to fetch.
     */
    where?: employeesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of employees to fetch.
     */
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for employees.
     */
    cursor?: employeesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of employees.
     */
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * employees findMany
   */
  export type employeesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter, which employees to fetch.
     */
    where?: employeesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of employees to fetch.
     */
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing employees.
     */
    cursor?: employeesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of employees.
     */
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * employees create
   */
  export type employeesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * The data needed to create a employees.
     */
    data: XOR<employeesCreateInput, employeesUncheckedCreateInput>
  }

  /**
   * employees createMany
   */
  export type employeesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many employees.
     */
    data: employeesCreateManyInput | employeesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * employees createManyAndReturn
   */
  export type employeesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * The data used to create many employees.
     */
    data: employeesCreateManyInput | employeesCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * employees update
   */
  export type employeesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * The data needed to update a employees.
     */
    data: XOR<employeesUpdateInput, employeesUncheckedUpdateInput>
    /**
     * Choose, which employees to update.
     */
    where: employeesWhereUniqueInput
  }

  /**
   * employees updateMany
   */
  export type employeesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update employees.
     */
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyInput>
    /**
     * Filter which employees to update
     */
    where?: employeesWhereInput
    /**
     * Limit how many employees to update.
     */
    limit?: number
  }

  /**
   * employees updateManyAndReturn
   */
  export type employeesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * The data used to update employees.
     */
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyInput>
    /**
     * Filter which employees to update
     */
    where?: employeesWhereInput
    /**
     * Limit how many employees to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * employees upsert
   */
  export type employeesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * The filter to search for the employees to update in case it exists.
     */
    where: employeesWhereUniqueInput
    /**
     * In case the employees found by the `where` argument doesn't exist, create a new employees with this data.
     */
    create: XOR<employeesCreateInput, employeesUncheckedCreateInput>
    /**
     * In case the employees was found with the provided `where` argument, update it with this data.
     */
    update: XOR<employeesUpdateInput, employeesUncheckedUpdateInput>
  }

  /**
   * employees delete
   */
  export type employeesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    /**
     * Filter which employees to delete.
     */
    where: employeesWhereUniqueInput
  }

  /**
   * employees deleteMany
   */
  export type employeesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which employees to delete
     */
    where?: employeesWhereInput
    /**
     * Limit how many employees to delete.
     */
    limit?: number
  }

  /**
   * employees.departments
   */
  export type employees$departmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    where?: departmentsWhereInput
  }

  /**
   * employees.job_positions
   */
  export type employees$job_positionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    where?: job_positionsWhereInput
  }

  /**
   * employees.supervisor
   */
  export type employees$supervisorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
  }

  /**
   * employees.subordinates
   */
  export type employees$subordinatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    cursor?: employeesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * employees.secondary_supervisor
   */
  export type employees$secondary_supervisorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
  }

  /**
   * employees.secondary_subordinates
   */
  export type employees$secondary_subordinatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    cursor?: employeesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * employees without action
   */
  export type employeesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
  }


  /**
   * Model departments
   */

  export type AggregateDepartments = {
    _count: DepartmentsCountAggregateOutputType | null
    _avg: DepartmentsAvgAggregateOutputType | null
    _sum: DepartmentsSumAggregateOutputType | null
    _min: DepartmentsMinAggregateOutputType | null
    _max: DepartmentsMaxAggregateOutputType | null
  }

  export type DepartmentsAvgAggregateOutputType = {
    id: number | null
  }

  export type DepartmentsSumAggregateOutputType = {
    id: number | null
  }

  export type DepartmentsMinAggregateOutputType = {
    id: number | null
    name: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type DepartmentsMaxAggregateOutputType = {
    id: number | null
    name: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type DepartmentsCountAggregateOutputType = {
    id: number
    name: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type DepartmentsAvgAggregateInputType = {
    id?: true
  }

  export type DepartmentsSumAggregateInputType = {
    id?: true
  }

  export type DepartmentsMinAggregateInputType = {
    id?: true
    name?: true
    created_at?: true
    updated_at?: true
  }

  export type DepartmentsMaxAggregateInputType = {
    id?: true
    name?: true
    created_at?: true
    updated_at?: true
  }

  export type DepartmentsCountAggregateInputType = {
    id?: true
    name?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type DepartmentsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which departments to aggregate.
     */
    where?: departmentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of departments to fetch.
     */
    orderBy?: departmentsOrderByWithRelationInput | departmentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: departmentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` departments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` departments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned departments
    **/
    _count?: true | DepartmentsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DepartmentsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DepartmentsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DepartmentsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DepartmentsMaxAggregateInputType
  }

  export type GetDepartmentsAggregateType<T extends DepartmentsAggregateArgs> = {
        [P in keyof T & keyof AggregateDepartments]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDepartments[P]>
      : GetScalarType<T[P], AggregateDepartments[P]>
  }




  export type departmentsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: departmentsWhereInput
    orderBy?: departmentsOrderByWithAggregationInput | departmentsOrderByWithAggregationInput[]
    by: DepartmentsScalarFieldEnum[] | DepartmentsScalarFieldEnum
    having?: departmentsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DepartmentsCountAggregateInputType | true
    _avg?: DepartmentsAvgAggregateInputType
    _sum?: DepartmentsSumAggregateInputType
    _min?: DepartmentsMinAggregateInputType
    _max?: DepartmentsMaxAggregateInputType
  }

  export type DepartmentsGroupByOutputType = {
    id: number
    name: string
    created_at: Date | null
    updated_at: Date | null
    _count: DepartmentsCountAggregateOutputType | null
    _avg: DepartmentsAvgAggregateOutputType | null
    _sum: DepartmentsSumAggregateOutputType | null
    _min: DepartmentsMinAggregateOutputType | null
    _max: DepartmentsMaxAggregateOutputType | null
  }

  type GetDepartmentsGroupByPayload<T extends departmentsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DepartmentsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DepartmentsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DepartmentsGroupByOutputType[P]>
            : GetScalarType<T[P], DepartmentsGroupByOutputType[P]>
        }
      >
    >


  export type departmentsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    created_at?: boolean
    updated_at?: boolean
    employees?: boolean | departments$employeesArgs<ExtArgs>
    job_positions?: boolean | departments$job_positionsArgs<ExtArgs>
    _count?: boolean | DepartmentsCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["departments"]>

  export type departmentsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["departments"]>

  export type departmentsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["departments"]>

  export type departmentsSelectScalar = {
    id?: boolean
    name?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type departmentsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "created_at" | "updated_at", ExtArgs["result"]["departments"]>
  export type departmentsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employees?: boolean | departments$employeesArgs<ExtArgs>
    job_positions?: boolean | departments$job_positionsArgs<ExtArgs>
    _count?: boolean | DepartmentsCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type departmentsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type departmentsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $departmentsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "departments"
    objects: {
      employees: Prisma.$employeesPayload<ExtArgs>[]
      job_positions: Prisma.$job_positionsPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      created_at: Date | null
      updated_at: Date | null
    }, ExtArgs["result"]["departments"]>
    composites: {}
  }

  type departmentsGetPayload<S extends boolean | null | undefined | departmentsDefaultArgs> = $Result.GetResult<Prisma.$departmentsPayload, S>

  type departmentsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<departmentsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DepartmentsCountAggregateInputType | true
    }

  export interface departmentsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['departments'], meta: { name: 'departments' } }
    /**
     * Find zero or one Departments that matches the filter.
     * @param {departmentsFindUniqueArgs} args - Arguments to find a Departments
     * @example
     * // Get one Departments
     * const departments = await prisma.departments.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends departmentsFindUniqueArgs>(args: SelectSubset<T, departmentsFindUniqueArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Departments that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {departmentsFindUniqueOrThrowArgs} args - Arguments to find a Departments
     * @example
     * // Get one Departments
     * const departments = await prisma.departments.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends departmentsFindUniqueOrThrowArgs>(args: SelectSubset<T, departmentsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Departments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsFindFirstArgs} args - Arguments to find a Departments
     * @example
     * // Get one Departments
     * const departments = await prisma.departments.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends departmentsFindFirstArgs>(args?: SelectSubset<T, departmentsFindFirstArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Departments that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsFindFirstOrThrowArgs} args - Arguments to find a Departments
     * @example
     * // Get one Departments
     * const departments = await prisma.departments.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends departmentsFindFirstOrThrowArgs>(args?: SelectSubset<T, departmentsFindFirstOrThrowArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Departments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Departments
     * const departments = await prisma.departments.findMany()
     * 
     * // Get first 10 Departments
     * const departments = await prisma.departments.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const departmentsWithIdOnly = await prisma.departments.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends departmentsFindManyArgs>(args?: SelectSubset<T, departmentsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Departments.
     * @param {departmentsCreateArgs} args - Arguments to create a Departments.
     * @example
     * // Create one Departments
     * const Departments = await prisma.departments.create({
     *   data: {
     *     // ... data to create a Departments
     *   }
     * })
     * 
     */
    create<T extends departmentsCreateArgs>(args: SelectSubset<T, departmentsCreateArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Departments.
     * @param {departmentsCreateManyArgs} args - Arguments to create many Departments.
     * @example
     * // Create many Departments
     * const departments = await prisma.departments.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends departmentsCreateManyArgs>(args?: SelectSubset<T, departmentsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Departments and returns the data saved in the database.
     * @param {departmentsCreateManyAndReturnArgs} args - Arguments to create many Departments.
     * @example
     * // Create many Departments
     * const departments = await prisma.departments.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Departments and only return the `id`
     * const departmentsWithIdOnly = await prisma.departments.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends departmentsCreateManyAndReturnArgs>(args?: SelectSubset<T, departmentsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Departments.
     * @param {departmentsDeleteArgs} args - Arguments to delete one Departments.
     * @example
     * // Delete one Departments
     * const Departments = await prisma.departments.delete({
     *   where: {
     *     // ... filter to delete one Departments
     *   }
     * })
     * 
     */
    delete<T extends departmentsDeleteArgs>(args: SelectSubset<T, departmentsDeleteArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Departments.
     * @param {departmentsUpdateArgs} args - Arguments to update one Departments.
     * @example
     * // Update one Departments
     * const departments = await prisma.departments.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends departmentsUpdateArgs>(args: SelectSubset<T, departmentsUpdateArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Departments.
     * @param {departmentsDeleteManyArgs} args - Arguments to filter Departments to delete.
     * @example
     * // Delete a few Departments
     * const { count } = await prisma.departments.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends departmentsDeleteManyArgs>(args?: SelectSubset<T, departmentsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Departments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Departments
     * const departments = await prisma.departments.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends departmentsUpdateManyArgs>(args: SelectSubset<T, departmentsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Departments and returns the data updated in the database.
     * @param {departmentsUpdateManyAndReturnArgs} args - Arguments to update many Departments.
     * @example
     * // Update many Departments
     * const departments = await prisma.departments.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Departments and only return the `id`
     * const departmentsWithIdOnly = await prisma.departments.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends departmentsUpdateManyAndReturnArgs>(args: SelectSubset<T, departmentsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Departments.
     * @param {departmentsUpsertArgs} args - Arguments to update or create a Departments.
     * @example
     * // Update or create a Departments
     * const departments = await prisma.departments.upsert({
     *   create: {
     *     // ... data to create a Departments
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Departments we want to update
     *   }
     * })
     */
    upsert<T extends departmentsUpsertArgs>(args: SelectSubset<T, departmentsUpsertArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Departments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsCountArgs} args - Arguments to filter Departments to count.
     * @example
     * // Count the number of Departments
     * const count = await prisma.departments.count({
     *   where: {
     *     // ... the filter for the Departments we want to count
     *   }
     * })
    **/
    count<T extends departmentsCountArgs>(
      args?: Subset<T, departmentsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DepartmentsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Departments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DepartmentsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DepartmentsAggregateArgs>(args: Subset<T, DepartmentsAggregateArgs>): Prisma.PrismaPromise<GetDepartmentsAggregateType<T>>

    /**
     * Group by Departments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {departmentsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends departmentsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: departmentsGroupByArgs['orderBy'] }
        : { orderBy?: departmentsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, departmentsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDepartmentsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the departments model
   */
  readonly fields: departmentsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for departments.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__departmentsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    employees<T extends departments$employeesArgs<ExtArgs> = {}>(args?: Subset<T, departments$employeesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    job_positions<T extends departments$job_positionsArgs<ExtArgs> = {}>(args?: Subset<T, departments$job_positionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the departments model
   */
  interface departmentsFieldRefs {
    readonly id: FieldRef<"departments", 'Int'>
    readonly name: FieldRef<"departments", 'String'>
    readonly created_at: FieldRef<"departments", 'DateTime'>
    readonly updated_at: FieldRef<"departments", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * departments findUnique
   */
  export type departmentsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter, which departments to fetch.
     */
    where: departmentsWhereUniqueInput
  }

  /**
   * departments findUniqueOrThrow
   */
  export type departmentsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter, which departments to fetch.
     */
    where: departmentsWhereUniqueInput
  }

  /**
   * departments findFirst
   */
  export type departmentsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter, which departments to fetch.
     */
    where?: departmentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of departments to fetch.
     */
    orderBy?: departmentsOrderByWithRelationInput | departmentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for departments.
     */
    cursor?: departmentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` departments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` departments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of departments.
     */
    distinct?: DepartmentsScalarFieldEnum | DepartmentsScalarFieldEnum[]
  }

  /**
   * departments findFirstOrThrow
   */
  export type departmentsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter, which departments to fetch.
     */
    where?: departmentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of departments to fetch.
     */
    orderBy?: departmentsOrderByWithRelationInput | departmentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for departments.
     */
    cursor?: departmentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` departments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` departments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of departments.
     */
    distinct?: DepartmentsScalarFieldEnum | DepartmentsScalarFieldEnum[]
  }

  /**
   * departments findMany
   */
  export type departmentsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter, which departments to fetch.
     */
    where?: departmentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of departments to fetch.
     */
    orderBy?: departmentsOrderByWithRelationInput | departmentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing departments.
     */
    cursor?: departmentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` departments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` departments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of departments.
     */
    distinct?: DepartmentsScalarFieldEnum | DepartmentsScalarFieldEnum[]
  }

  /**
   * departments create
   */
  export type departmentsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * The data needed to create a departments.
     */
    data: XOR<departmentsCreateInput, departmentsUncheckedCreateInput>
  }

  /**
   * departments createMany
   */
  export type departmentsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many departments.
     */
    data: departmentsCreateManyInput | departmentsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * departments createManyAndReturn
   */
  export type departmentsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * The data used to create many departments.
     */
    data: departmentsCreateManyInput | departmentsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * departments update
   */
  export type departmentsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * The data needed to update a departments.
     */
    data: XOR<departmentsUpdateInput, departmentsUncheckedUpdateInput>
    /**
     * Choose, which departments to update.
     */
    where: departmentsWhereUniqueInput
  }

  /**
   * departments updateMany
   */
  export type departmentsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update departments.
     */
    data: XOR<departmentsUpdateManyMutationInput, departmentsUncheckedUpdateManyInput>
    /**
     * Filter which departments to update
     */
    where?: departmentsWhereInput
    /**
     * Limit how many departments to update.
     */
    limit?: number
  }

  /**
   * departments updateManyAndReturn
   */
  export type departmentsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * The data used to update departments.
     */
    data: XOR<departmentsUpdateManyMutationInput, departmentsUncheckedUpdateManyInput>
    /**
     * Filter which departments to update
     */
    where?: departmentsWhereInput
    /**
     * Limit how many departments to update.
     */
    limit?: number
  }

  /**
   * departments upsert
   */
  export type departmentsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * The filter to search for the departments to update in case it exists.
     */
    where: departmentsWhereUniqueInput
    /**
     * In case the departments found by the `where` argument doesn't exist, create a new departments with this data.
     */
    create: XOR<departmentsCreateInput, departmentsUncheckedCreateInput>
    /**
     * In case the departments was found with the provided `where` argument, update it with this data.
     */
    update: XOR<departmentsUpdateInput, departmentsUncheckedUpdateInput>
  }

  /**
   * departments delete
   */
  export type departmentsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    /**
     * Filter which departments to delete.
     */
    where: departmentsWhereUniqueInput
  }

  /**
   * departments deleteMany
   */
  export type departmentsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which departments to delete
     */
    where?: departmentsWhereInput
    /**
     * Limit how many departments to delete.
     */
    limit?: number
  }

  /**
   * departments.employees
   */
  export type departments$employeesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    cursor?: employeesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * departments.job_positions
   */
  export type departments$job_positionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    where?: job_positionsWhereInput
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    cursor?: job_positionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Job_positionsScalarFieldEnum | Job_positionsScalarFieldEnum[]
  }

  /**
   * departments without action
   */
  export type departmentsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
  }


  /**
   * Model job_positions
   */

  export type AggregateJob_positions = {
    _count: Job_positionsCountAggregateOutputType | null
    _avg: Job_positionsAvgAggregateOutputType | null
    _sum: Job_positionsSumAggregateOutputType | null
    _min: Job_positionsMinAggregateOutputType | null
    _max: Job_positionsMaxAggregateOutputType | null
  }

  export type Job_positionsAvgAggregateOutputType = {
    id: number | null
    department_id: number | null
    parent_id: number | null
    order_index: number | null
  }

  export type Job_positionsSumAggregateOutputType = {
    id: number | null
    department_id: number | null
    parent_id: number | null
    order_index: number | null
  }

  export type Job_positionsMinAggregateOutputType = {
    id: number | null
    department_id: number | null
    parent_id: number | null
    title: string | null
    node_type: string | null
    order_index: number | null
    is_ot_eligible: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Job_positionsMaxAggregateOutputType = {
    id: number | null
    department_id: number | null
    parent_id: number | null
    title: string | null
    node_type: string | null
    order_index: number | null
    is_ot_eligible: boolean | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type Job_positionsCountAggregateOutputType = {
    id: number
    department_id: number
    parent_id: number
    title: number
    node_type: number
    order_index: number
    is_ot_eligible: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Job_positionsAvgAggregateInputType = {
    id?: true
    department_id?: true
    parent_id?: true
    order_index?: true
  }

  export type Job_positionsSumAggregateInputType = {
    id?: true
    department_id?: true
    parent_id?: true
    order_index?: true
  }

  export type Job_positionsMinAggregateInputType = {
    id?: true
    department_id?: true
    parent_id?: true
    title?: true
    node_type?: true
    order_index?: true
    is_ot_eligible?: true
    created_at?: true
    updated_at?: true
  }

  export type Job_positionsMaxAggregateInputType = {
    id?: true
    department_id?: true
    parent_id?: true
    title?: true
    node_type?: true
    order_index?: true
    is_ot_eligible?: true
    created_at?: true
    updated_at?: true
  }

  export type Job_positionsCountAggregateInputType = {
    id?: true
    department_id?: true
    parent_id?: true
    title?: true
    node_type?: true
    order_index?: true
    is_ot_eligible?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Job_positionsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which job_positions to aggregate.
     */
    where?: job_positionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of job_positions to fetch.
     */
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: job_positionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` job_positions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` job_positions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned job_positions
    **/
    _count?: true | Job_positionsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Job_positionsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Job_positionsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Job_positionsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Job_positionsMaxAggregateInputType
  }

  export type GetJob_positionsAggregateType<T extends Job_positionsAggregateArgs> = {
        [P in keyof T & keyof AggregateJob_positions]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateJob_positions[P]>
      : GetScalarType<T[P], AggregateJob_positions[P]>
  }




  export type job_positionsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: job_positionsWhereInput
    orderBy?: job_positionsOrderByWithAggregationInput | job_positionsOrderByWithAggregationInput[]
    by: Job_positionsScalarFieldEnum[] | Job_positionsScalarFieldEnum
    having?: job_positionsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Job_positionsCountAggregateInputType | true
    _avg?: Job_positionsAvgAggregateInputType
    _sum?: Job_positionsSumAggregateInputType
    _min?: Job_positionsMinAggregateInputType
    _max?: Job_positionsMaxAggregateInputType
  }

  export type Job_positionsGroupByOutputType = {
    id: number
    department_id: number | null
    parent_id: number | null
    title: string
    node_type: string | null
    order_index: number | null
    is_ot_eligible: boolean
    created_at: Date | null
    updated_at: Date | null
    _count: Job_positionsCountAggregateOutputType | null
    _avg: Job_positionsAvgAggregateOutputType | null
    _sum: Job_positionsSumAggregateOutputType | null
    _min: Job_positionsMinAggregateOutputType | null
    _max: Job_positionsMaxAggregateOutputType | null
  }

  type GetJob_positionsGroupByPayload<T extends job_positionsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Job_positionsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Job_positionsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Job_positionsGroupByOutputType[P]>
            : GetScalarType<T[P], Job_positionsGroupByOutputType[P]>
        }
      >
    >


  export type job_positionsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department_id?: boolean
    parent_id?: boolean
    title?: boolean
    node_type?: boolean
    order_index?: boolean
    is_ot_eligible?: boolean
    created_at?: boolean
    updated_at?: boolean
    employees?: boolean | job_positions$employeesArgs<ExtArgs>
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
    children?: boolean | job_positions$childrenArgs<ExtArgs>
    _count?: boolean | Job_positionsCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["job_positions"]>

  export type job_positionsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department_id?: boolean
    parent_id?: boolean
    title?: boolean
    node_type?: boolean
    order_index?: boolean
    is_ot_eligible?: boolean
    created_at?: boolean
    updated_at?: boolean
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
  }, ExtArgs["result"]["job_positions"]>

  export type job_positionsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    department_id?: boolean
    parent_id?: boolean
    title?: boolean
    node_type?: boolean
    order_index?: boolean
    is_ot_eligible?: boolean
    created_at?: boolean
    updated_at?: boolean
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
  }, ExtArgs["result"]["job_positions"]>

  export type job_positionsSelectScalar = {
    id?: boolean
    department_id?: boolean
    parent_id?: boolean
    title?: boolean
    node_type?: boolean
    order_index?: boolean
    is_ot_eligible?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type job_positionsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "department_id" | "parent_id" | "title" | "node_type" | "order_index" | "is_ot_eligible" | "created_at" | "updated_at", ExtArgs["result"]["job_positions"]>
  export type job_positionsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employees?: boolean | job_positions$employeesArgs<ExtArgs>
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
    children?: boolean | job_positions$childrenArgs<ExtArgs>
    _count?: boolean | Job_positionsCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type job_positionsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
  }
  export type job_positionsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    departments?: boolean | job_positions$departmentsArgs<ExtArgs>
    parent?: boolean | job_positions$parentArgs<ExtArgs>
  }

  export type $job_positionsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "job_positions"
    objects: {
      employees: Prisma.$employeesPayload<ExtArgs>[]
      departments: Prisma.$departmentsPayload<ExtArgs> | null
      parent: Prisma.$job_positionsPayload<ExtArgs> | null
      children: Prisma.$job_positionsPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      department_id: number | null
      parent_id: number | null
      title: string
      node_type: string | null
      order_index: number | null
      is_ot_eligible: boolean
      created_at: Date | null
      updated_at: Date | null
    }, ExtArgs["result"]["job_positions"]>
    composites: {}
  }

  type job_positionsGetPayload<S extends boolean | null | undefined | job_positionsDefaultArgs> = $Result.GetResult<Prisma.$job_positionsPayload, S>

  type job_positionsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<job_positionsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Job_positionsCountAggregateInputType | true
    }

  export interface job_positionsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['job_positions'], meta: { name: 'job_positions' } }
    /**
     * Find zero or one Job_positions that matches the filter.
     * @param {job_positionsFindUniqueArgs} args - Arguments to find a Job_positions
     * @example
     * // Get one Job_positions
     * const job_positions = await prisma.job_positions.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends job_positionsFindUniqueArgs>(args: SelectSubset<T, job_positionsFindUniqueArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Job_positions that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {job_positionsFindUniqueOrThrowArgs} args - Arguments to find a Job_positions
     * @example
     * // Get one Job_positions
     * const job_positions = await prisma.job_positions.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends job_positionsFindUniqueOrThrowArgs>(args: SelectSubset<T, job_positionsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Job_positions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsFindFirstArgs} args - Arguments to find a Job_positions
     * @example
     * // Get one Job_positions
     * const job_positions = await prisma.job_positions.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends job_positionsFindFirstArgs>(args?: SelectSubset<T, job_positionsFindFirstArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Job_positions that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsFindFirstOrThrowArgs} args - Arguments to find a Job_positions
     * @example
     * // Get one Job_positions
     * const job_positions = await prisma.job_positions.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends job_positionsFindFirstOrThrowArgs>(args?: SelectSubset<T, job_positionsFindFirstOrThrowArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Job_positions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Job_positions
     * const job_positions = await prisma.job_positions.findMany()
     * 
     * // Get first 10 Job_positions
     * const job_positions = await prisma.job_positions.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const job_positionsWithIdOnly = await prisma.job_positions.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends job_positionsFindManyArgs>(args?: SelectSubset<T, job_positionsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Job_positions.
     * @param {job_positionsCreateArgs} args - Arguments to create a Job_positions.
     * @example
     * // Create one Job_positions
     * const Job_positions = await prisma.job_positions.create({
     *   data: {
     *     // ... data to create a Job_positions
     *   }
     * })
     * 
     */
    create<T extends job_positionsCreateArgs>(args: SelectSubset<T, job_positionsCreateArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Job_positions.
     * @param {job_positionsCreateManyArgs} args - Arguments to create many Job_positions.
     * @example
     * // Create many Job_positions
     * const job_positions = await prisma.job_positions.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends job_positionsCreateManyArgs>(args?: SelectSubset<T, job_positionsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Job_positions and returns the data saved in the database.
     * @param {job_positionsCreateManyAndReturnArgs} args - Arguments to create many Job_positions.
     * @example
     * // Create many Job_positions
     * const job_positions = await prisma.job_positions.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Job_positions and only return the `id`
     * const job_positionsWithIdOnly = await prisma.job_positions.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends job_positionsCreateManyAndReturnArgs>(args?: SelectSubset<T, job_positionsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Job_positions.
     * @param {job_positionsDeleteArgs} args - Arguments to delete one Job_positions.
     * @example
     * // Delete one Job_positions
     * const Job_positions = await prisma.job_positions.delete({
     *   where: {
     *     // ... filter to delete one Job_positions
     *   }
     * })
     * 
     */
    delete<T extends job_positionsDeleteArgs>(args: SelectSubset<T, job_positionsDeleteArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Job_positions.
     * @param {job_positionsUpdateArgs} args - Arguments to update one Job_positions.
     * @example
     * // Update one Job_positions
     * const job_positions = await prisma.job_positions.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends job_positionsUpdateArgs>(args: SelectSubset<T, job_positionsUpdateArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Job_positions.
     * @param {job_positionsDeleteManyArgs} args - Arguments to filter Job_positions to delete.
     * @example
     * // Delete a few Job_positions
     * const { count } = await prisma.job_positions.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends job_positionsDeleteManyArgs>(args?: SelectSubset<T, job_positionsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Job_positions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Job_positions
     * const job_positions = await prisma.job_positions.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends job_positionsUpdateManyArgs>(args: SelectSubset<T, job_positionsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Job_positions and returns the data updated in the database.
     * @param {job_positionsUpdateManyAndReturnArgs} args - Arguments to update many Job_positions.
     * @example
     * // Update many Job_positions
     * const job_positions = await prisma.job_positions.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Job_positions and only return the `id`
     * const job_positionsWithIdOnly = await prisma.job_positions.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends job_positionsUpdateManyAndReturnArgs>(args: SelectSubset<T, job_positionsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Job_positions.
     * @param {job_positionsUpsertArgs} args - Arguments to update or create a Job_positions.
     * @example
     * // Update or create a Job_positions
     * const job_positions = await prisma.job_positions.upsert({
     *   create: {
     *     // ... data to create a Job_positions
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Job_positions we want to update
     *   }
     * })
     */
    upsert<T extends job_positionsUpsertArgs>(args: SelectSubset<T, job_positionsUpsertArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Job_positions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsCountArgs} args - Arguments to filter Job_positions to count.
     * @example
     * // Count the number of Job_positions
     * const count = await prisma.job_positions.count({
     *   where: {
     *     // ... the filter for the Job_positions we want to count
     *   }
     * })
    **/
    count<T extends job_positionsCountArgs>(
      args?: Subset<T, job_positionsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Job_positionsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Job_positions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Job_positionsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Job_positionsAggregateArgs>(args: Subset<T, Job_positionsAggregateArgs>): Prisma.PrismaPromise<GetJob_positionsAggregateType<T>>

    /**
     * Group by Job_positions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {job_positionsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends job_positionsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: job_positionsGroupByArgs['orderBy'] }
        : { orderBy?: job_positionsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, job_positionsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetJob_positionsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the job_positions model
   */
  readonly fields: job_positionsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for job_positions.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__job_positionsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    employees<T extends job_positions$employeesArgs<ExtArgs> = {}>(args?: Subset<T, job_positions$employeesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$employeesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    departments<T extends job_positions$departmentsArgs<ExtArgs> = {}>(args?: Subset<T, job_positions$departmentsArgs<ExtArgs>>): Prisma__departmentsClient<$Result.GetResult<Prisma.$departmentsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    parent<T extends job_positions$parentArgs<ExtArgs> = {}>(args?: Subset<T, job_positions$parentArgs<ExtArgs>>): Prisma__job_positionsClient<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    children<T extends job_positions$childrenArgs<ExtArgs> = {}>(args?: Subset<T, job_positions$childrenArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$job_positionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the job_positions model
   */
  interface job_positionsFieldRefs {
    readonly id: FieldRef<"job_positions", 'Int'>
    readonly department_id: FieldRef<"job_positions", 'Int'>
    readonly parent_id: FieldRef<"job_positions", 'Int'>
    readonly title: FieldRef<"job_positions", 'String'>
    readonly node_type: FieldRef<"job_positions", 'String'>
    readonly order_index: FieldRef<"job_positions", 'Int'>
    readonly is_ot_eligible: FieldRef<"job_positions", 'Boolean'>
    readonly created_at: FieldRef<"job_positions", 'DateTime'>
    readonly updated_at: FieldRef<"job_positions", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * job_positions findUnique
   */
  export type job_positionsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter, which job_positions to fetch.
     */
    where: job_positionsWhereUniqueInput
  }

  /**
   * job_positions findUniqueOrThrow
   */
  export type job_positionsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter, which job_positions to fetch.
     */
    where: job_positionsWhereUniqueInput
  }

  /**
   * job_positions findFirst
   */
  export type job_positionsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter, which job_positions to fetch.
     */
    where?: job_positionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of job_positions to fetch.
     */
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for job_positions.
     */
    cursor?: job_positionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` job_positions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` job_positions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of job_positions.
     */
    distinct?: Job_positionsScalarFieldEnum | Job_positionsScalarFieldEnum[]
  }

  /**
   * job_positions findFirstOrThrow
   */
  export type job_positionsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter, which job_positions to fetch.
     */
    where?: job_positionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of job_positions to fetch.
     */
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for job_positions.
     */
    cursor?: job_positionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` job_positions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` job_positions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of job_positions.
     */
    distinct?: Job_positionsScalarFieldEnum | Job_positionsScalarFieldEnum[]
  }

  /**
   * job_positions findMany
   */
  export type job_positionsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter, which job_positions to fetch.
     */
    where?: job_positionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of job_positions to fetch.
     */
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing job_positions.
     */
    cursor?: job_positionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` job_positions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` job_positions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of job_positions.
     */
    distinct?: Job_positionsScalarFieldEnum | Job_positionsScalarFieldEnum[]
  }

  /**
   * job_positions create
   */
  export type job_positionsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * The data needed to create a job_positions.
     */
    data: XOR<job_positionsCreateInput, job_positionsUncheckedCreateInput>
  }

  /**
   * job_positions createMany
   */
  export type job_positionsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many job_positions.
     */
    data: job_positionsCreateManyInput | job_positionsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * job_positions createManyAndReturn
   */
  export type job_positionsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * The data used to create many job_positions.
     */
    data: job_positionsCreateManyInput | job_positionsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * job_positions update
   */
  export type job_positionsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * The data needed to update a job_positions.
     */
    data: XOR<job_positionsUpdateInput, job_positionsUncheckedUpdateInput>
    /**
     * Choose, which job_positions to update.
     */
    where: job_positionsWhereUniqueInput
  }

  /**
   * job_positions updateMany
   */
  export type job_positionsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update job_positions.
     */
    data: XOR<job_positionsUpdateManyMutationInput, job_positionsUncheckedUpdateManyInput>
    /**
     * Filter which job_positions to update
     */
    where?: job_positionsWhereInput
    /**
     * Limit how many job_positions to update.
     */
    limit?: number
  }

  /**
   * job_positions updateManyAndReturn
   */
  export type job_positionsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * The data used to update job_positions.
     */
    data: XOR<job_positionsUpdateManyMutationInput, job_positionsUncheckedUpdateManyInput>
    /**
     * Filter which job_positions to update
     */
    where?: job_positionsWhereInput
    /**
     * Limit how many job_positions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * job_positions upsert
   */
  export type job_positionsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * The filter to search for the job_positions to update in case it exists.
     */
    where: job_positionsWhereUniqueInput
    /**
     * In case the job_positions found by the `where` argument doesn't exist, create a new job_positions with this data.
     */
    create: XOR<job_positionsCreateInput, job_positionsUncheckedCreateInput>
    /**
     * In case the job_positions was found with the provided `where` argument, update it with this data.
     */
    update: XOR<job_positionsUpdateInput, job_positionsUncheckedUpdateInput>
  }

  /**
   * job_positions delete
   */
  export type job_positionsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    /**
     * Filter which job_positions to delete.
     */
    where: job_positionsWhereUniqueInput
  }

  /**
   * job_positions deleteMany
   */
  export type job_positionsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which job_positions to delete
     */
    where?: job_positionsWhereInput
    /**
     * Limit how many job_positions to delete.
     */
    limit?: number
  }

  /**
   * job_positions.employees
   */
  export type job_positions$employeesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the employees
     */
    select?: employeesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the employees
     */
    omit?: employeesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: employeesInclude<ExtArgs> | null
    where?: employeesWhereInput
    orderBy?: employeesOrderByWithRelationInput | employeesOrderByWithRelationInput[]
    cursor?: employeesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EmployeesScalarFieldEnum | EmployeesScalarFieldEnum[]
  }

  /**
   * job_positions.departments
   */
  export type job_positions$departmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the departments
     */
    select?: departmentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the departments
     */
    omit?: departmentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: departmentsInclude<ExtArgs> | null
    where?: departmentsWhereInput
  }

  /**
   * job_positions.parent
   */
  export type job_positions$parentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    where?: job_positionsWhereInput
  }

  /**
   * job_positions.children
   */
  export type job_positions$childrenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
    where?: job_positionsWhereInput
    orderBy?: job_positionsOrderByWithRelationInput | job_positionsOrderByWithRelationInput[]
    cursor?: job_positionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Job_positionsScalarFieldEnum | Job_positionsScalarFieldEnum[]
  }

  /**
   * job_positions without action
   */
  export type job_positionsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the job_positions
     */
    select?: job_positionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the job_positions
     */
    omit?: job_positionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: job_positionsInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const EmployeesScalarFieldEnum: {
    emp_id: 'emp_id',
    name: 'name',
    nickname: 'nickname',
    pin_hash: 'pin_hash',
    is_active: 'is_active',
    department_id: 'department_id',
    job_position_id: 'job_position_id',
    supervisor_id: 'supervisor_id',
    secondary_supervisor_id: 'secondary_supervisor_id',
    phone_number: 'phone_number',
    email: 'email',
    branch_id: 'branch_id',
    gender: 'gender',
    hire_date: 'hire_date',
    birth_date: 'birth_date',
    base_salary: 'base_salary',
    otp_code: 'otp_code',
    otp_expires_at: 'otp_expires_at',
    bank_account_no: 'bank_account_no',
    bank_name: 'bank_name',
    is_on_trial: 'is_on_trial',
    has_telephone_allowance: 'has_telephone_allowance',
    position_allowance: 'position_allowance',
    address: 'address',
    national_id_card: 'national_id_card',
    salary_type: 'salary_type',
    line_user_id: 'line_user_id',
    is_checkin_exempt: 'is_checkin_exempt',
    probation_end_date: 'probation_end_date',
    resignation_date: 'resignation_date',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type EmployeesScalarFieldEnum = (typeof EmployeesScalarFieldEnum)[keyof typeof EmployeesScalarFieldEnum]


  export const DepartmentsScalarFieldEnum: {
    id: 'id',
    name: 'name',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type DepartmentsScalarFieldEnum = (typeof DepartmentsScalarFieldEnum)[keyof typeof DepartmentsScalarFieldEnum]


  export const Job_positionsScalarFieldEnum: {
    id: 'id',
    department_id: 'department_id',
    parent_id: 'parent_id',
    title: 'title',
    node_type: 'node_type',
    order_index: 'order_index',
    is_ot_eligible: 'is_ot_eligible',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Job_positionsScalarFieldEnum = (typeof Job_positionsScalarFieldEnum)[keyof typeof Job_positionsScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type employeesWhereInput = {
    AND?: employeesWhereInput | employeesWhereInput[]
    OR?: employeesWhereInput[]
    NOT?: employeesWhereInput | employeesWhereInput[]
    emp_id?: StringFilter<"employees"> | string
    name?: StringFilter<"employees"> | string
    nickname?: StringNullableFilter<"employees"> | string | null
    pin_hash?: StringNullableFilter<"employees"> | string | null
    is_active?: BoolFilter<"employees"> | boolean
    department_id?: IntNullableFilter<"employees"> | number | null
    job_position_id?: IntNullableFilter<"employees"> | number | null
    supervisor_id?: StringNullableFilter<"employees"> | string | null
    secondary_supervisor_id?: StringNullableFilter<"employees"> | string | null
    phone_number?: StringNullableFilter<"employees"> | string | null
    email?: StringNullableFilter<"employees"> | string | null
    branch_id?: StringNullableFilter<"employees"> | string | null
    gender?: StringNullableFilter<"employees"> | string | null
    hire_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    birth_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    base_salary?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    otp_code?: StringNullableFilter<"employees"> | string | null
    otp_expires_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    bank_account_no?: StringNullableFilter<"employees"> | string | null
    bank_name?: StringNullableFilter<"employees"> | string | null
    is_on_trial?: BoolNullableFilter<"employees"> | boolean | null
    has_telephone_allowance?: BoolNullableFilter<"employees"> | boolean | null
    position_allowance?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    address?: StringNullableFilter<"employees"> | string | null
    national_id_card?: StringNullableFilter<"employees"> | string | null
    salary_type?: StringNullableFilter<"employees"> | string | null
    line_user_id?: StringNullableFilter<"employees"> | string | null
    is_checkin_exempt?: BoolNullableFilter<"employees"> | boolean | null
    probation_end_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    resignation_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    created_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    departments?: XOR<DepartmentsNullableScalarRelationFilter, departmentsWhereInput> | null
    job_positions?: XOR<Job_positionsNullableScalarRelationFilter, job_positionsWhereInput> | null
    supervisor?: XOR<EmployeesNullableScalarRelationFilter, employeesWhereInput> | null
    subordinates?: EmployeesListRelationFilter
    secondary_supervisor?: XOR<EmployeesNullableScalarRelationFilter, employeesWhereInput> | null
    secondary_subordinates?: EmployeesListRelationFilter
  }

  export type employeesOrderByWithRelationInput = {
    emp_id?: SortOrder
    name?: SortOrder
    nickname?: SortOrderInput | SortOrder
    pin_hash?: SortOrderInput | SortOrder
    is_active?: SortOrder
    department_id?: SortOrderInput | SortOrder
    job_position_id?: SortOrderInput | SortOrder
    supervisor_id?: SortOrderInput | SortOrder
    secondary_supervisor_id?: SortOrderInput | SortOrder
    phone_number?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    branch_id?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    hire_date?: SortOrderInput | SortOrder
    birth_date?: SortOrderInput | SortOrder
    base_salary?: SortOrderInput | SortOrder
    otp_code?: SortOrderInput | SortOrder
    otp_expires_at?: SortOrderInput | SortOrder
    bank_account_no?: SortOrderInput | SortOrder
    bank_name?: SortOrderInput | SortOrder
    is_on_trial?: SortOrderInput | SortOrder
    has_telephone_allowance?: SortOrderInput | SortOrder
    position_allowance?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    national_id_card?: SortOrderInput | SortOrder
    salary_type?: SortOrderInput | SortOrder
    line_user_id?: SortOrderInput | SortOrder
    is_checkin_exempt?: SortOrderInput | SortOrder
    probation_end_date?: SortOrderInput | SortOrder
    resignation_date?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    departments?: departmentsOrderByWithRelationInput
    job_positions?: job_positionsOrderByWithRelationInput
    supervisor?: employeesOrderByWithRelationInput
    subordinates?: employeesOrderByRelationAggregateInput
    secondary_supervisor?: employeesOrderByWithRelationInput
    secondary_subordinates?: employeesOrderByRelationAggregateInput
  }

  export type employeesWhereUniqueInput = Prisma.AtLeast<{
    emp_id?: string
    line_user_id?: string
    AND?: employeesWhereInput | employeesWhereInput[]
    OR?: employeesWhereInput[]
    NOT?: employeesWhereInput | employeesWhereInput[]
    name?: StringFilter<"employees"> | string
    nickname?: StringNullableFilter<"employees"> | string | null
    pin_hash?: StringNullableFilter<"employees"> | string | null
    is_active?: BoolFilter<"employees"> | boolean
    department_id?: IntNullableFilter<"employees"> | number | null
    job_position_id?: IntNullableFilter<"employees"> | number | null
    supervisor_id?: StringNullableFilter<"employees"> | string | null
    secondary_supervisor_id?: StringNullableFilter<"employees"> | string | null
    phone_number?: StringNullableFilter<"employees"> | string | null
    email?: StringNullableFilter<"employees"> | string | null
    branch_id?: StringNullableFilter<"employees"> | string | null
    gender?: StringNullableFilter<"employees"> | string | null
    hire_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    birth_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    base_salary?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    otp_code?: StringNullableFilter<"employees"> | string | null
    otp_expires_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    bank_account_no?: StringNullableFilter<"employees"> | string | null
    bank_name?: StringNullableFilter<"employees"> | string | null
    is_on_trial?: BoolNullableFilter<"employees"> | boolean | null
    has_telephone_allowance?: BoolNullableFilter<"employees"> | boolean | null
    position_allowance?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    address?: StringNullableFilter<"employees"> | string | null
    national_id_card?: StringNullableFilter<"employees"> | string | null
    salary_type?: StringNullableFilter<"employees"> | string | null
    is_checkin_exempt?: BoolNullableFilter<"employees"> | boolean | null
    probation_end_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    resignation_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    created_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    departments?: XOR<DepartmentsNullableScalarRelationFilter, departmentsWhereInput> | null
    job_positions?: XOR<Job_positionsNullableScalarRelationFilter, job_positionsWhereInput> | null
    supervisor?: XOR<EmployeesNullableScalarRelationFilter, employeesWhereInput> | null
    subordinates?: EmployeesListRelationFilter
    secondary_supervisor?: XOR<EmployeesNullableScalarRelationFilter, employeesWhereInput> | null
    secondary_subordinates?: EmployeesListRelationFilter
  }, "emp_id" | "line_user_id">

  export type employeesOrderByWithAggregationInput = {
    emp_id?: SortOrder
    name?: SortOrder
    nickname?: SortOrderInput | SortOrder
    pin_hash?: SortOrderInput | SortOrder
    is_active?: SortOrder
    department_id?: SortOrderInput | SortOrder
    job_position_id?: SortOrderInput | SortOrder
    supervisor_id?: SortOrderInput | SortOrder
    secondary_supervisor_id?: SortOrderInput | SortOrder
    phone_number?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    branch_id?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    hire_date?: SortOrderInput | SortOrder
    birth_date?: SortOrderInput | SortOrder
    base_salary?: SortOrderInput | SortOrder
    otp_code?: SortOrderInput | SortOrder
    otp_expires_at?: SortOrderInput | SortOrder
    bank_account_no?: SortOrderInput | SortOrder
    bank_name?: SortOrderInput | SortOrder
    is_on_trial?: SortOrderInput | SortOrder
    has_telephone_allowance?: SortOrderInput | SortOrder
    position_allowance?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    national_id_card?: SortOrderInput | SortOrder
    salary_type?: SortOrderInput | SortOrder
    line_user_id?: SortOrderInput | SortOrder
    is_checkin_exempt?: SortOrderInput | SortOrder
    probation_end_date?: SortOrderInput | SortOrder
    resignation_date?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    _count?: employeesCountOrderByAggregateInput
    _avg?: employeesAvgOrderByAggregateInput
    _max?: employeesMaxOrderByAggregateInput
    _min?: employeesMinOrderByAggregateInput
    _sum?: employeesSumOrderByAggregateInput
  }

  export type employeesScalarWhereWithAggregatesInput = {
    AND?: employeesScalarWhereWithAggregatesInput | employeesScalarWhereWithAggregatesInput[]
    OR?: employeesScalarWhereWithAggregatesInput[]
    NOT?: employeesScalarWhereWithAggregatesInput | employeesScalarWhereWithAggregatesInput[]
    emp_id?: StringWithAggregatesFilter<"employees"> | string
    name?: StringWithAggregatesFilter<"employees"> | string
    nickname?: StringNullableWithAggregatesFilter<"employees"> | string | null
    pin_hash?: StringNullableWithAggregatesFilter<"employees"> | string | null
    is_active?: BoolWithAggregatesFilter<"employees"> | boolean
    department_id?: IntNullableWithAggregatesFilter<"employees"> | number | null
    job_position_id?: IntNullableWithAggregatesFilter<"employees"> | number | null
    supervisor_id?: StringNullableWithAggregatesFilter<"employees"> | string | null
    secondary_supervisor_id?: StringNullableWithAggregatesFilter<"employees"> | string | null
    phone_number?: StringNullableWithAggregatesFilter<"employees"> | string | null
    email?: StringNullableWithAggregatesFilter<"employees"> | string | null
    branch_id?: StringNullableWithAggregatesFilter<"employees"> | string | null
    gender?: StringNullableWithAggregatesFilter<"employees"> | string | null
    hire_date?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    birth_date?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    base_salary?: DecimalNullableWithAggregatesFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    otp_code?: StringNullableWithAggregatesFilter<"employees"> | string | null
    otp_expires_at?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    bank_account_no?: StringNullableWithAggregatesFilter<"employees"> | string | null
    bank_name?: StringNullableWithAggregatesFilter<"employees"> | string | null
    is_on_trial?: BoolNullableWithAggregatesFilter<"employees"> | boolean | null
    has_telephone_allowance?: BoolNullableWithAggregatesFilter<"employees"> | boolean | null
    position_allowance?: DecimalNullableWithAggregatesFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    address?: StringNullableWithAggregatesFilter<"employees"> | string | null
    national_id_card?: StringNullableWithAggregatesFilter<"employees"> | string | null
    salary_type?: StringNullableWithAggregatesFilter<"employees"> | string | null
    line_user_id?: StringNullableWithAggregatesFilter<"employees"> | string | null
    is_checkin_exempt?: BoolNullableWithAggregatesFilter<"employees"> | boolean | null
    probation_end_date?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    resignation_date?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    created_at?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
    updated_at?: DateTimeNullableWithAggregatesFilter<"employees"> | Date | string | null
  }

  export type departmentsWhereInput = {
    AND?: departmentsWhereInput | departmentsWhereInput[]
    OR?: departmentsWhereInput[]
    NOT?: departmentsWhereInput | departmentsWhereInput[]
    id?: IntFilter<"departments"> | number
    name?: StringFilter<"departments"> | string
    created_at?: DateTimeNullableFilter<"departments"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"departments"> | Date | string | null
    employees?: EmployeesListRelationFilter
    job_positions?: Job_positionsListRelationFilter
  }

  export type departmentsOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    employees?: employeesOrderByRelationAggregateInput
    job_positions?: job_positionsOrderByRelationAggregateInput
  }

  export type departmentsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: departmentsWhereInput | departmentsWhereInput[]
    OR?: departmentsWhereInput[]
    NOT?: departmentsWhereInput | departmentsWhereInput[]
    name?: StringFilter<"departments"> | string
    created_at?: DateTimeNullableFilter<"departments"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"departments"> | Date | string | null
    employees?: EmployeesListRelationFilter
    job_positions?: Job_positionsListRelationFilter
  }, "id">

  export type departmentsOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    _count?: departmentsCountOrderByAggregateInput
    _avg?: departmentsAvgOrderByAggregateInput
    _max?: departmentsMaxOrderByAggregateInput
    _min?: departmentsMinOrderByAggregateInput
    _sum?: departmentsSumOrderByAggregateInput
  }

  export type departmentsScalarWhereWithAggregatesInput = {
    AND?: departmentsScalarWhereWithAggregatesInput | departmentsScalarWhereWithAggregatesInput[]
    OR?: departmentsScalarWhereWithAggregatesInput[]
    NOT?: departmentsScalarWhereWithAggregatesInput | departmentsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"departments"> | number
    name?: StringWithAggregatesFilter<"departments"> | string
    created_at?: DateTimeNullableWithAggregatesFilter<"departments"> | Date | string | null
    updated_at?: DateTimeNullableWithAggregatesFilter<"departments"> | Date | string | null
  }

  export type job_positionsWhereInput = {
    AND?: job_positionsWhereInput | job_positionsWhereInput[]
    OR?: job_positionsWhereInput[]
    NOT?: job_positionsWhereInput | job_positionsWhereInput[]
    id?: IntFilter<"job_positions"> | number
    department_id?: IntNullableFilter<"job_positions"> | number | null
    parent_id?: IntNullableFilter<"job_positions"> | number | null
    title?: StringFilter<"job_positions"> | string
    node_type?: StringNullableFilter<"job_positions"> | string | null
    order_index?: IntNullableFilter<"job_positions"> | number | null
    is_ot_eligible?: BoolFilter<"job_positions"> | boolean
    created_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
    employees?: EmployeesListRelationFilter
    departments?: XOR<DepartmentsNullableScalarRelationFilter, departmentsWhereInput> | null
    parent?: XOR<Job_positionsNullableScalarRelationFilter, job_positionsWhereInput> | null
    children?: Job_positionsListRelationFilter
  }

  export type job_positionsOrderByWithRelationInput = {
    id?: SortOrder
    department_id?: SortOrderInput | SortOrder
    parent_id?: SortOrderInput | SortOrder
    title?: SortOrder
    node_type?: SortOrderInput | SortOrder
    order_index?: SortOrderInput | SortOrder
    is_ot_eligible?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    employees?: employeesOrderByRelationAggregateInput
    departments?: departmentsOrderByWithRelationInput
    parent?: job_positionsOrderByWithRelationInput
    children?: job_positionsOrderByRelationAggregateInput
  }

  export type job_positionsWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: job_positionsWhereInput | job_positionsWhereInput[]
    OR?: job_positionsWhereInput[]
    NOT?: job_positionsWhereInput | job_positionsWhereInput[]
    department_id?: IntNullableFilter<"job_positions"> | number | null
    parent_id?: IntNullableFilter<"job_positions"> | number | null
    title?: StringFilter<"job_positions"> | string
    node_type?: StringNullableFilter<"job_positions"> | string | null
    order_index?: IntNullableFilter<"job_positions"> | number | null
    is_ot_eligible?: BoolFilter<"job_positions"> | boolean
    created_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
    employees?: EmployeesListRelationFilter
    departments?: XOR<DepartmentsNullableScalarRelationFilter, departmentsWhereInput> | null
    parent?: XOR<Job_positionsNullableScalarRelationFilter, job_positionsWhereInput> | null
    children?: Job_positionsListRelationFilter
  }, "id">

  export type job_positionsOrderByWithAggregationInput = {
    id?: SortOrder
    department_id?: SortOrderInput | SortOrder
    parent_id?: SortOrderInput | SortOrder
    title?: SortOrder
    node_type?: SortOrderInput | SortOrder
    order_index?: SortOrderInput | SortOrder
    is_ot_eligible?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    _count?: job_positionsCountOrderByAggregateInput
    _avg?: job_positionsAvgOrderByAggregateInput
    _max?: job_positionsMaxOrderByAggregateInput
    _min?: job_positionsMinOrderByAggregateInput
    _sum?: job_positionsSumOrderByAggregateInput
  }

  export type job_positionsScalarWhereWithAggregatesInput = {
    AND?: job_positionsScalarWhereWithAggregatesInput | job_positionsScalarWhereWithAggregatesInput[]
    OR?: job_positionsScalarWhereWithAggregatesInput[]
    NOT?: job_positionsScalarWhereWithAggregatesInput | job_positionsScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"job_positions"> | number
    department_id?: IntNullableWithAggregatesFilter<"job_positions"> | number | null
    parent_id?: IntNullableWithAggregatesFilter<"job_positions"> | number | null
    title?: StringWithAggregatesFilter<"job_positions"> | string
    node_type?: StringNullableWithAggregatesFilter<"job_positions"> | string | null
    order_index?: IntNullableWithAggregatesFilter<"job_positions"> | number | null
    is_ot_eligible?: BoolWithAggregatesFilter<"job_positions"> | boolean
    created_at?: DateTimeNullableWithAggregatesFilter<"job_positions"> | Date | string | null
    updated_at?: DateTimeNullableWithAggregatesFilter<"job_positions"> | Date | string | null
  }

  export type employeesCreateInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUpdateInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesCreateManyInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type employeesUpdateManyMutationInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type employeesUncheckedUpdateManyInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type departmentsCreateInput = {
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutDepartmentsInput
    job_positions?: job_positionsCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsUncheckedCreateInput = {
    id?: number
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutDepartmentsInput
    job_positions?: job_positionsUncheckedCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutDepartmentsNestedInput
    job_positions?: job_positionsUpdateManyWithoutDepartmentsNestedInput
  }

  export type departmentsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutDepartmentsNestedInput
    job_positions?: job_positionsUncheckedUpdateManyWithoutDepartmentsNestedInput
  }

  export type departmentsCreateManyInput = {
    id?: number
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type departmentsUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type departmentsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type job_positionsCreateInput = {
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutJob_positionsInput
    departments?: departmentsCreateNestedOneWithoutJob_positionsInput
    parent?: job_positionsCreateNestedOneWithoutChildrenInput
    children?: job_positionsCreateNestedManyWithoutParentInput
  }

  export type job_positionsUncheckedCreateInput = {
    id?: number
    department_id?: number | null
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutJob_positionsInput
    children?: job_positionsUncheckedCreateNestedManyWithoutParentInput
  }

  export type job_positionsUpdateInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutJob_positionsNestedInput
    departments?: departmentsUpdateOneWithoutJob_positionsNestedInput
    parent?: job_positionsUpdateOneWithoutChildrenNestedInput
    children?: job_positionsUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutJob_positionsNestedInput
    children?: job_positionsUncheckedUpdateManyWithoutParentNestedInput
  }

  export type job_positionsCreateManyInput = {
    id?: number
    department_id?: number | null
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type job_positionsUpdateManyMutationInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type job_positionsUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type DepartmentsNullableScalarRelationFilter = {
    is?: departmentsWhereInput | null
    isNot?: departmentsWhereInput | null
  }

  export type Job_positionsNullableScalarRelationFilter = {
    is?: job_positionsWhereInput | null
    isNot?: job_positionsWhereInput | null
  }

  export type EmployeesNullableScalarRelationFilter = {
    is?: employeesWhereInput | null
    isNot?: employeesWhereInput | null
  }

  export type EmployeesListRelationFilter = {
    every?: employeesWhereInput
    some?: employeesWhereInput
    none?: employeesWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type employeesOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type employeesCountOrderByAggregateInput = {
    emp_id?: SortOrder
    name?: SortOrder
    nickname?: SortOrder
    pin_hash?: SortOrder
    is_active?: SortOrder
    department_id?: SortOrder
    job_position_id?: SortOrder
    supervisor_id?: SortOrder
    secondary_supervisor_id?: SortOrder
    phone_number?: SortOrder
    email?: SortOrder
    branch_id?: SortOrder
    gender?: SortOrder
    hire_date?: SortOrder
    birth_date?: SortOrder
    base_salary?: SortOrder
    otp_code?: SortOrder
    otp_expires_at?: SortOrder
    bank_account_no?: SortOrder
    bank_name?: SortOrder
    is_on_trial?: SortOrder
    has_telephone_allowance?: SortOrder
    position_allowance?: SortOrder
    address?: SortOrder
    national_id_card?: SortOrder
    salary_type?: SortOrder
    line_user_id?: SortOrder
    is_checkin_exempt?: SortOrder
    probation_end_date?: SortOrder
    resignation_date?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type employeesAvgOrderByAggregateInput = {
    department_id?: SortOrder
    job_position_id?: SortOrder
    base_salary?: SortOrder
    position_allowance?: SortOrder
  }

  export type employeesMaxOrderByAggregateInput = {
    emp_id?: SortOrder
    name?: SortOrder
    nickname?: SortOrder
    pin_hash?: SortOrder
    is_active?: SortOrder
    department_id?: SortOrder
    job_position_id?: SortOrder
    supervisor_id?: SortOrder
    secondary_supervisor_id?: SortOrder
    phone_number?: SortOrder
    email?: SortOrder
    branch_id?: SortOrder
    gender?: SortOrder
    hire_date?: SortOrder
    birth_date?: SortOrder
    base_salary?: SortOrder
    otp_code?: SortOrder
    otp_expires_at?: SortOrder
    bank_account_no?: SortOrder
    bank_name?: SortOrder
    is_on_trial?: SortOrder
    has_telephone_allowance?: SortOrder
    position_allowance?: SortOrder
    address?: SortOrder
    national_id_card?: SortOrder
    salary_type?: SortOrder
    line_user_id?: SortOrder
    is_checkin_exempt?: SortOrder
    probation_end_date?: SortOrder
    resignation_date?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type employeesMinOrderByAggregateInput = {
    emp_id?: SortOrder
    name?: SortOrder
    nickname?: SortOrder
    pin_hash?: SortOrder
    is_active?: SortOrder
    department_id?: SortOrder
    job_position_id?: SortOrder
    supervisor_id?: SortOrder
    secondary_supervisor_id?: SortOrder
    phone_number?: SortOrder
    email?: SortOrder
    branch_id?: SortOrder
    gender?: SortOrder
    hire_date?: SortOrder
    birth_date?: SortOrder
    base_salary?: SortOrder
    otp_code?: SortOrder
    otp_expires_at?: SortOrder
    bank_account_no?: SortOrder
    bank_name?: SortOrder
    is_on_trial?: SortOrder
    has_telephone_allowance?: SortOrder
    position_allowance?: SortOrder
    address?: SortOrder
    national_id_card?: SortOrder
    salary_type?: SortOrder
    line_user_id?: SortOrder
    is_checkin_exempt?: SortOrder
    probation_end_date?: SortOrder
    resignation_date?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type employeesSumOrderByAggregateInput = {
    department_id?: SortOrder
    job_position_id?: SortOrder
    base_salary?: SortOrder
    position_allowance?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type Job_positionsListRelationFilter = {
    every?: job_positionsWhereInput
    some?: job_positionsWhereInput
    none?: job_positionsWhereInput
  }

  export type job_positionsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type departmentsCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type departmentsAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type departmentsMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type departmentsMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type departmentsSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type job_positionsCountOrderByAggregateInput = {
    id?: SortOrder
    department_id?: SortOrder
    parent_id?: SortOrder
    title?: SortOrder
    node_type?: SortOrder
    order_index?: SortOrder
    is_ot_eligible?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type job_positionsAvgOrderByAggregateInput = {
    id?: SortOrder
    department_id?: SortOrder
    parent_id?: SortOrder
    order_index?: SortOrder
  }

  export type job_positionsMaxOrderByAggregateInput = {
    id?: SortOrder
    department_id?: SortOrder
    parent_id?: SortOrder
    title?: SortOrder
    node_type?: SortOrder
    order_index?: SortOrder
    is_ot_eligible?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type job_positionsMinOrderByAggregateInput = {
    id?: SortOrder
    department_id?: SortOrder
    parent_id?: SortOrder
    title?: SortOrder
    node_type?: SortOrder
    order_index?: SortOrder
    is_ot_eligible?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type job_positionsSumOrderByAggregateInput = {
    id?: SortOrder
    department_id?: SortOrder
    parent_id?: SortOrder
    order_index?: SortOrder
  }

  export type departmentsCreateNestedOneWithoutEmployeesInput = {
    create?: XOR<departmentsCreateWithoutEmployeesInput, departmentsUncheckedCreateWithoutEmployeesInput>
    connectOrCreate?: departmentsCreateOrConnectWithoutEmployeesInput
    connect?: departmentsWhereUniqueInput
  }

  export type job_positionsCreateNestedOneWithoutEmployeesInput = {
    create?: XOR<job_positionsCreateWithoutEmployeesInput, job_positionsUncheckedCreateWithoutEmployeesInput>
    connectOrCreate?: job_positionsCreateOrConnectWithoutEmployeesInput
    connect?: job_positionsWhereUniqueInput
  }

  export type employeesCreateNestedOneWithoutSubordinatesInput = {
    create?: XOR<employeesCreateWithoutSubordinatesInput, employeesUncheckedCreateWithoutSubordinatesInput>
    connectOrCreate?: employeesCreateOrConnectWithoutSubordinatesInput
    connect?: employeesWhereUniqueInput
  }

  export type employeesCreateNestedManyWithoutSupervisorInput = {
    create?: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput> | employeesCreateWithoutSupervisorInput[] | employeesUncheckedCreateWithoutSupervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSupervisorInput | employeesCreateOrConnectWithoutSupervisorInput[]
    createMany?: employeesCreateManySupervisorInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type employeesCreateNestedOneWithoutSecondary_subordinatesInput = {
    create?: XOR<employeesCreateWithoutSecondary_subordinatesInput, employeesUncheckedCreateWithoutSecondary_subordinatesInput>
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_subordinatesInput
    connect?: employeesWhereUniqueInput
  }

  export type employeesCreateNestedManyWithoutSecondary_supervisorInput = {
    create?: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput> | employeesCreateWithoutSecondary_supervisorInput[] | employeesUncheckedCreateWithoutSecondary_supervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_supervisorInput | employeesCreateOrConnectWithoutSecondary_supervisorInput[]
    createMany?: employeesCreateManySecondary_supervisorInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type employeesUncheckedCreateNestedManyWithoutSupervisorInput = {
    create?: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput> | employeesCreateWithoutSupervisorInput[] | employeesUncheckedCreateWithoutSupervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSupervisorInput | employeesCreateOrConnectWithoutSupervisorInput[]
    createMany?: employeesCreateManySupervisorInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput = {
    create?: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput> | employeesCreateWithoutSecondary_supervisorInput[] | employeesUncheckedCreateWithoutSecondary_supervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_supervisorInput | employeesCreateOrConnectWithoutSecondary_supervisorInput[]
    createMany?: employeesCreateManySecondary_supervisorInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type departmentsUpdateOneWithoutEmployeesNestedInput = {
    create?: XOR<departmentsCreateWithoutEmployeesInput, departmentsUncheckedCreateWithoutEmployeesInput>
    connectOrCreate?: departmentsCreateOrConnectWithoutEmployeesInput
    upsert?: departmentsUpsertWithoutEmployeesInput
    disconnect?: departmentsWhereInput | boolean
    delete?: departmentsWhereInput | boolean
    connect?: departmentsWhereUniqueInput
    update?: XOR<XOR<departmentsUpdateToOneWithWhereWithoutEmployeesInput, departmentsUpdateWithoutEmployeesInput>, departmentsUncheckedUpdateWithoutEmployeesInput>
  }

  export type job_positionsUpdateOneWithoutEmployeesNestedInput = {
    create?: XOR<job_positionsCreateWithoutEmployeesInput, job_positionsUncheckedCreateWithoutEmployeesInput>
    connectOrCreate?: job_positionsCreateOrConnectWithoutEmployeesInput
    upsert?: job_positionsUpsertWithoutEmployeesInput
    disconnect?: job_positionsWhereInput | boolean
    delete?: job_positionsWhereInput | boolean
    connect?: job_positionsWhereUniqueInput
    update?: XOR<XOR<job_positionsUpdateToOneWithWhereWithoutEmployeesInput, job_positionsUpdateWithoutEmployeesInput>, job_positionsUncheckedUpdateWithoutEmployeesInput>
  }

  export type employeesUpdateOneWithoutSubordinatesNestedInput = {
    create?: XOR<employeesCreateWithoutSubordinatesInput, employeesUncheckedCreateWithoutSubordinatesInput>
    connectOrCreate?: employeesCreateOrConnectWithoutSubordinatesInput
    upsert?: employeesUpsertWithoutSubordinatesInput
    disconnect?: employeesWhereInput | boolean
    delete?: employeesWhereInput | boolean
    connect?: employeesWhereUniqueInput
    update?: XOR<XOR<employeesUpdateToOneWithWhereWithoutSubordinatesInput, employeesUpdateWithoutSubordinatesInput>, employeesUncheckedUpdateWithoutSubordinatesInput>
  }

  export type employeesUpdateManyWithoutSupervisorNestedInput = {
    create?: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput> | employeesCreateWithoutSupervisorInput[] | employeesUncheckedCreateWithoutSupervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSupervisorInput | employeesCreateOrConnectWithoutSupervisorInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutSupervisorInput | employeesUpsertWithWhereUniqueWithoutSupervisorInput[]
    createMany?: employeesCreateManySupervisorInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutSupervisorInput | employeesUpdateWithWhereUniqueWithoutSupervisorInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutSupervisorInput | employeesUpdateManyWithWhereWithoutSupervisorInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type employeesUpdateOneWithoutSecondary_subordinatesNestedInput = {
    create?: XOR<employeesCreateWithoutSecondary_subordinatesInput, employeesUncheckedCreateWithoutSecondary_subordinatesInput>
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_subordinatesInput
    upsert?: employeesUpsertWithoutSecondary_subordinatesInput
    disconnect?: employeesWhereInput | boolean
    delete?: employeesWhereInput | boolean
    connect?: employeesWhereUniqueInput
    update?: XOR<XOR<employeesUpdateToOneWithWhereWithoutSecondary_subordinatesInput, employeesUpdateWithoutSecondary_subordinatesInput>, employeesUncheckedUpdateWithoutSecondary_subordinatesInput>
  }

  export type employeesUpdateManyWithoutSecondary_supervisorNestedInput = {
    create?: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput> | employeesCreateWithoutSecondary_supervisorInput[] | employeesUncheckedCreateWithoutSecondary_supervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_supervisorInput | employeesCreateOrConnectWithoutSecondary_supervisorInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutSecondary_supervisorInput | employeesUpsertWithWhereUniqueWithoutSecondary_supervisorInput[]
    createMany?: employeesCreateManySecondary_supervisorInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutSecondary_supervisorInput | employeesUpdateWithWhereUniqueWithoutSecondary_supervisorInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutSecondary_supervisorInput | employeesUpdateManyWithWhereWithoutSecondary_supervisorInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type employeesUncheckedUpdateManyWithoutSupervisorNestedInput = {
    create?: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput> | employeesCreateWithoutSupervisorInput[] | employeesUncheckedCreateWithoutSupervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSupervisorInput | employeesCreateOrConnectWithoutSupervisorInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutSupervisorInput | employeesUpsertWithWhereUniqueWithoutSupervisorInput[]
    createMany?: employeesCreateManySupervisorInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutSupervisorInput | employeesUpdateWithWhereUniqueWithoutSupervisorInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutSupervisorInput | employeesUpdateManyWithWhereWithoutSupervisorInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput = {
    create?: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput> | employeesCreateWithoutSecondary_supervisorInput[] | employeesUncheckedCreateWithoutSecondary_supervisorInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutSecondary_supervisorInput | employeesCreateOrConnectWithoutSecondary_supervisorInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutSecondary_supervisorInput | employeesUpsertWithWhereUniqueWithoutSecondary_supervisorInput[]
    createMany?: employeesCreateManySecondary_supervisorInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutSecondary_supervisorInput | employeesUpdateWithWhereUniqueWithoutSecondary_supervisorInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutSecondary_supervisorInput | employeesUpdateManyWithWhereWithoutSecondary_supervisorInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type employeesCreateNestedManyWithoutDepartmentsInput = {
    create?: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput> | employeesCreateWithoutDepartmentsInput[] | employeesUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutDepartmentsInput | employeesCreateOrConnectWithoutDepartmentsInput[]
    createMany?: employeesCreateManyDepartmentsInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type job_positionsCreateNestedManyWithoutDepartmentsInput = {
    create?: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput> | job_positionsCreateWithoutDepartmentsInput[] | job_positionsUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutDepartmentsInput | job_positionsCreateOrConnectWithoutDepartmentsInput[]
    createMany?: job_positionsCreateManyDepartmentsInputEnvelope
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
  }

  export type employeesUncheckedCreateNestedManyWithoutDepartmentsInput = {
    create?: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput> | employeesCreateWithoutDepartmentsInput[] | employeesUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutDepartmentsInput | employeesCreateOrConnectWithoutDepartmentsInput[]
    createMany?: employeesCreateManyDepartmentsInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type job_positionsUncheckedCreateNestedManyWithoutDepartmentsInput = {
    create?: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput> | job_positionsCreateWithoutDepartmentsInput[] | job_positionsUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutDepartmentsInput | job_positionsCreateOrConnectWithoutDepartmentsInput[]
    createMany?: job_positionsCreateManyDepartmentsInputEnvelope
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
  }

  export type employeesUpdateManyWithoutDepartmentsNestedInput = {
    create?: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput> | employeesCreateWithoutDepartmentsInput[] | employeesUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutDepartmentsInput | employeesCreateOrConnectWithoutDepartmentsInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutDepartmentsInput | employeesUpsertWithWhereUniqueWithoutDepartmentsInput[]
    createMany?: employeesCreateManyDepartmentsInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutDepartmentsInput | employeesUpdateWithWhereUniqueWithoutDepartmentsInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutDepartmentsInput | employeesUpdateManyWithWhereWithoutDepartmentsInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type job_positionsUpdateManyWithoutDepartmentsNestedInput = {
    create?: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput> | job_positionsCreateWithoutDepartmentsInput[] | job_positionsUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutDepartmentsInput | job_positionsCreateOrConnectWithoutDepartmentsInput[]
    upsert?: job_positionsUpsertWithWhereUniqueWithoutDepartmentsInput | job_positionsUpsertWithWhereUniqueWithoutDepartmentsInput[]
    createMany?: job_positionsCreateManyDepartmentsInputEnvelope
    set?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    disconnect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    delete?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    update?: job_positionsUpdateWithWhereUniqueWithoutDepartmentsInput | job_positionsUpdateWithWhereUniqueWithoutDepartmentsInput[]
    updateMany?: job_positionsUpdateManyWithWhereWithoutDepartmentsInput | job_positionsUpdateManyWithWhereWithoutDepartmentsInput[]
    deleteMany?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type employeesUncheckedUpdateManyWithoutDepartmentsNestedInput = {
    create?: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput> | employeesCreateWithoutDepartmentsInput[] | employeesUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutDepartmentsInput | employeesCreateOrConnectWithoutDepartmentsInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutDepartmentsInput | employeesUpsertWithWhereUniqueWithoutDepartmentsInput[]
    createMany?: employeesCreateManyDepartmentsInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutDepartmentsInput | employeesUpdateWithWhereUniqueWithoutDepartmentsInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutDepartmentsInput | employeesUpdateManyWithWhereWithoutDepartmentsInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type job_positionsUncheckedUpdateManyWithoutDepartmentsNestedInput = {
    create?: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput> | job_positionsCreateWithoutDepartmentsInput[] | job_positionsUncheckedCreateWithoutDepartmentsInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutDepartmentsInput | job_positionsCreateOrConnectWithoutDepartmentsInput[]
    upsert?: job_positionsUpsertWithWhereUniqueWithoutDepartmentsInput | job_positionsUpsertWithWhereUniqueWithoutDepartmentsInput[]
    createMany?: job_positionsCreateManyDepartmentsInputEnvelope
    set?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    disconnect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    delete?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    update?: job_positionsUpdateWithWhereUniqueWithoutDepartmentsInput | job_positionsUpdateWithWhereUniqueWithoutDepartmentsInput[]
    updateMany?: job_positionsUpdateManyWithWhereWithoutDepartmentsInput | job_positionsUpdateManyWithWhereWithoutDepartmentsInput[]
    deleteMany?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
  }

  export type employeesCreateNestedManyWithoutJob_positionsInput = {
    create?: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput> | employeesCreateWithoutJob_positionsInput[] | employeesUncheckedCreateWithoutJob_positionsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutJob_positionsInput | employeesCreateOrConnectWithoutJob_positionsInput[]
    createMany?: employeesCreateManyJob_positionsInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type departmentsCreateNestedOneWithoutJob_positionsInput = {
    create?: XOR<departmentsCreateWithoutJob_positionsInput, departmentsUncheckedCreateWithoutJob_positionsInput>
    connectOrCreate?: departmentsCreateOrConnectWithoutJob_positionsInput
    connect?: departmentsWhereUniqueInput
  }

  export type job_positionsCreateNestedOneWithoutChildrenInput = {
    create?: XOR<job_positionsCreateWithoutChildrenInput, job_positionsUncheckedCreateWithoutChildrenInput>
    connectOrCreate?: job_positionsCreateOrConnectWithoutChildrenInput
    connect?: job_positionsWhereUniqueInput
  }

  export type job_positionsCreateNestedManyWithoutParentInput = {
    create?: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput> | job_positionsCreateWithoutParentInput[] | job_positionsUncheckedCreateWithoutParentInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutParentInput | job_positionsCreateOrConnectWithoutParentInput[]
    createMany?: job_positionsCreateManyParentInputEnvelope
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
  }

  export type employeesUncheckedCreateNestedManyWithoutJob_positionsInput = {
    create?: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput> | employeesCreateWithoutJob_positionsInput[] | employeesUncheckedCreateWithoutJob_positionsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutJob_positionsInput | employeesCreateOrConnectWithoutJob_positionsInput[]
    createMany?: employeesCreateManyJob_positionsInputEnvelope
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
  }

  export type job_positionsUncheckedCreateNestedManyWithoutParentInput = {
    create?: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput> | job_positionsCreateWithoutParentInput[] | job_positionsUncheckedCreateWithoutParentInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutParentInput | job_positionsCreateOrConnectWithoutParentInput[]
    createMany?: job_positionsCreateManyParentInputEnvelope
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
  }

  export type employeesUpdateManyWithoutJob_positionsNestedInput = {
    create?: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput> | employeesCreateWithoutJob_positionsInput[] | employeesUncheckedCreateWithoutJob_positionsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutJob_positionsInput | employeesCreateOrConnectWithoutJob_positionsInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutJob_positionsInput | employeesUpsertWithWhereUniqueWithoutJob_positionsInput[]
    createMany?: employeesCreateManyJob_positionsInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutJob_positionsInput | employeesUpdateWithWhereUniqueWithoutJob_positionsInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutJob_positionsInput | employeesUpdateManyWithWhereWithoutJob_positionsInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type departmentsUpdateOneWithoutJob_positionsNestedInput = {
    create?: XOR<departmentsCreateWithoutJob_positionsInput, departmentsUncheckedCreateWithoutJob_positionsInput>
    connectOrCreate?: departmentsCreateOrConnectWithoutJob_positionsInput
    upsert?: departmentsUpsertWithoutJob_positionsInput
    disconnect?: departmentsWhereInput | boolean
    delete?: departmentsWhereInput | boolean
    connect?: departmentsWhereUniqueInput
    update?: XOR<XOR<departmentsUpdateToOneWithWhereWithoutJob_positionsInput, departmentsUpdateWithoutJob_positionsInput>, departmentsUncheckedUpdateWithoutJob_positionsInput>
  }

  export type job_positionsUpdateOneWithoutChildrenNestedInput = {
    create?: XOR<job_positionsCreateWithoutChildrenInput, job_positionsUncheckedCreateWithoutChildrenInput>
    connectOrCreate?: job_positionsCreateOrConnectWithoutChildrenInput
    upsert?: job_positionsUpsertWithoutChildrenInput
    disconnect?: job_positionsWhereInput | boolean
    delete?: job_positionsWhereInput | boolean
    connect?: job_positionsWhereUniqueInput
    update?: XOR<XOR<job_positionsUpdateToOneWithWhereWithoutChildrenInput, job_positionsUpdateWithoutChildrenInput>, job_positionsUncheckedUpdateWithoutChildrenInput>
  }

  export type job_positionsUpdateManyWithoutParentNestedInput = {
    create?: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput> | job_positionsCreateWithoutParentInput[] | job_positionsUncheckedCreateWithoutParentInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutParentInput | job_positionsCreateOrConnectWithoutParentInput[]
    upsert?: job_positionsUpsertWithWhereUniqueWithoutParentInput | job_positionsUpsertWithWhereUniqueWithoutParentInput[]
    createMany?: job_positionsCreateManyParentInputEnvelope
    set?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    disconnect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    delete?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    update?: job_positionsUpdateWithWhereUniqueWithoutParentInput | job_positionsUpdateWithWhereUniqueWithoutParentInput[]
    updateMany?: job_positionsUpdateManyWithWhereWithoutParentInput | job_positionsUpdateManyWithWhereWithoutParentInput[]
    deleteMany?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
  }

  export type employeesUncheckedUpdateManyWithoutJob_positionsNestedInput = {
    create?: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput> | employeesCreateWithoutJob_positionsInput[] | employeesUncheckedCreateWithoutJob_positionsInput[]
    connectOrCreate?: employeesCreateOrConnectWithoutJob_positionsInput | employeesCreateOrConnectWithoutJob_positionsInput[]
    upsert?: employeesUpsertWithWhereUniqueWithoutJob_positionsInput | employeesUpsertWithWhereUniqueWithoutJob_positionsInput[]
    createMany?: employeesCreateManyJob_positionsInputEnvelope
    set?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    disconnect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    delete?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    connect?: employeesWhereUniqueInput | employeesWhereUniqueInput[]
    update?: employeesUpdateWithWhereUniqueWithoutJob_positionsInput | employeesUpdateWithWhereUniqueWithoutJob_positionsInput[]
    updateMany?: employeesUpdateManyWithWhereWithoutJob_positionsInput | employeesUpdateManyWithWhereWithoutJob_positionsInput[]
    deleteMany?: employeesScalarWhereInput | employeesScalarWhereInput[]
  }

  export type job_positionsUncheckedUpdateManyWithoutParentNestedInput = {
    create?: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput> | job_positionsCreateWithoutParentInput[] | job_positionsUncheckedCreateWithoutParentInput[]
    connectOrCreate?: job_positionsCreateOrConnectWithoutParentInput | job_positionsCreateOrConnectWithoutParentInput[]
    upsert?: job_positionsUpsertWithWhereUniqueWithoutParentInput | job_positionsUpsertWithWhereUniqueWithoutParentInput[]
    createMany?: job_positionsCreateManyParentInputEnvelope
    set?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    disconnect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    delete?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    connect?: job_positionsWhereUniqueInput | job_positionsWhereUniqueInput[]
    update?: job_positionsUpdateWithWhereUniqueWithoutParentInput | job_positionsUpdateWithWhereUniqueWithoutParentInput[]
    updateMany?: job_positionsUpdateManyWithWhereWithoutParentInput | job_positionsUpdateManyWithWhereWithoutParentInput[]
    deleteMany?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type departmentsCreateWithoutEmployeesInput = {
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    job_positions?: job_positionsCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsUncheckedCreateWithoutEmployeesInput = {
    id?: number
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    job_positions?: job_positionsUncheckedCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsCreateOrConnectWithoutEmployeesInput = {
    where: departmentsWhereUniqueInput
    create: XOR<departmentsCreateWithoutEmployeesInput, departmentsUncheckedCreateWithoutEmployeesInput>
  }

  export type job_positionsCreateWithoutEmployeesInput = {
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutJob_positionsInput
    parent?: job_positionsCreateNestedOneWithoutChildrenInput
    children?: job_positionsCreateNestedManyWithoutParentInput
  }

  export type job_positionsUncheckedCreateWithoutEmployeesInput = {
    id?: number
    department_id?: number | null
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    children?: job_positionsUncheckedCreateNestedManyWithoutParentInput
  }

  export type job_positionsCreateOrConnectWithoutEmployeesInput = {
    where: job_positionsWhereUniqueInput
    create: XOR<job_positionsCreateWithoutEmployeesInput, job_positionsUncheckedCreateWithoutEmployeesInput>
  }

  export type employeesCreateWithoutSubordinatesInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateWithoutSubordinatesInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesCreateOrConnectWithoutSubordinatesInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutSubordinatesInput, employeesUncheckedCreateWithoutSubordinatesInput>
  }

  export type employeesCreateWithoutSupervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateWithoutSupervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesCreateOrConnectWithoutSupervisorInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput>
  }

  export type employeesCreateManySupervisorInputEnvelope = {
    data: employeesCreateManySupervisorInput | employeesCreateManySupervisorInput[]
    skipDuplicates?: boolean
  }

  export type employeesCreateWithoutSecondary_subordinatesInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
  }

  export type employeesUncheckedCreateWithoutSecondary_subordinatesInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
  }

  export type employeesCreateOrConnectWithoutSecondary_subordinatesInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutSecondary_subordinatesInput, employeesUncheckedCreateWithoutSecondary_subordinatesInput>
  }

  export type employeesCreateWithoutSecondary_supervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateWithoutSecondary_supervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesCreateOrConnectWithoutSecondary_supervisorInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput>
  }

  export type employeesCreateManySecondary_supervisorInputEnvelope = {
    data: employeesCreateManySecondary_supervisorInput | employeesCreateManySecondary_supervisorInput[]
    skipDuplicates?: boolean
  }

  export type departmentsUpsertWithoutEmployeesInput = {
    update: XOR<departmentsUpdateWithoutEmployeesInput, departmentsUncheckedUpdateWithoutEmployeesInput>
    create: XOR<departmentsCreateWithoutEmployeesInput, departmentsUncheckedCreateWithoutEmployeesInput>
    where?: departmentsWhereInput
  }

  export type departmentsUpdateToOneWithWhereWithoutEmployeesInput = {
    where?: departmentsWhereInput
    data: XOR<departmentsUpdateWithoutEmployeesInput, departmentsUncheckedUpdateWithoutEmployeesInput>
  }

  export type departmentsUpdateWithoutEmployeesInput = {
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    job_positions?: job_positionsUpdateManyWithoutDepartmentsNestedInput
  }

  export type departmentsUncheckedUpdateWithoutEmployeesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    job_positions?: job_positionsUncheckedUpdateManyWithoutDepartmentsNestedInput
  }

  export type job_positionsUpsertWithoutEmployeesInput = {
    update: XOR<job_positionsUpdateWithoutEmployeesInput, job_positionsUncheckedUpdateWithoutEmployeesInput>
    create: XOR<job_positionsCreateWithoutEmployeesInput, job_positionsUncheckedCreateWithoutEmployeesInput>
    where?: job_positionsWhereInput
  }

  export type job_positionsUpdateToOneWithWhereWithoutEmployeesInput = {
    where?: job_positionsWhereInput
    data: XOR<job_positionsUpdateWithoutEmployeesInput, job_positionsUncheckedUpdateWithoutEmployeesInput>
  }

  export type job_positionsUpdateWithoutEmployeesInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutJob_positionsNestedInput
    parent?: job_positionsUpdateOneWithoutChildrenNestedInput
    children?: job_positionsUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateWithoutEmployeesInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    children?: job_positionsUncheckedUpdateManyWithoutParentNestedInput
  }

  export type employeesUpsertWithoutSubordinatesInput = {
    update: XOR<employeesUpdateWithoutSubordinatesInput, employeesUncheckedUpdateWithoutSubordinatesInput>
    create: XOR<employeesCreateWithoutSubordinatesInput, employeesUncheckedCreateWithoutSubordinatesInput>
    where?: employeesWhereInput
  }

  export type employeesUpdateToOneWithWhereWithoutSubordinatesInput = {
    where?: employeesWhereInput
    data: XOR<employeesUpdateWithoutSubordinatesInput, employeesUncheckedUpdateWithoutSubordinatesInput>
  }

  export type employeesUpdateWithoutSubordinatesInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateWithoutSubordinatesInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUpsertWithWhereUniqueWithoutSupervisorInput = {
    where: employeesWhereUniqueInput
    update: XOR<employeesUpdateWithoutSupervisorInput, employeesUncheckedUpdateWithoutSupervisorInput>
    create: XOR<employeesCreateWithoutSupervisorInput, employeesUncheckedCreateWithoutSupervisorInput>
  }

  export type employeesUpdateWithWhereUniqueWithoutSupervisorInput = {
    where: employeesWhereUniqueInput
    data: XOR<employeesUpdateWithoutSupervisorInput, employeesUncheckedUpdateWithoutSupervisorInput>
  }

  export type employeesUpdateManyWithWhereWithoutSupervisorInput = {
    where: employeesScalarWhereInput
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyWithoutSupervisorInput>
  }

  export type employeesScalarWhereInput = {
    AND?: employeesScalarWhereInput | employeesScalarWhereInput[]
    OR?: employeesScalarWhereInput[]
    NOT?: employeesScalarWhereInput | employeesScalarWhereInput[]
    emp_id?: StringFilter<"employees"> | string
    name?: StringFilter<"employees"> | string
    nickname?: StringNullableFilter<"employees"> | string | null
    pin_hash?: StringNullableFilter<"employees"> | string | null
    is_active?: BoolFilter<"employees"> | boolean
    department_id?: IntNullableFilter<"employees"> | number | null
    job_position_id?: IntNullableFilter<"employees"> | number | null
    supervisor_id?: StringNullableFilter<"employees"> | string | null
    secondary_supervisor_id?: StringNullableFilter<"employees"> | string | null
    phone_number?: StringNullableFilter<"employees"> | string | null
    email?: StringNullableFilter<"employees"> | string | null
    branch_id?: StringNullableFilter<"employees"> | string | null
    gender?: StringNullableFilter<"employees"> | string | null
    hire_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    birth_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    base_salary?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    otp_code?: StringNullableFilter<"employees"> | string | null
    otp_expires_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    bank_account_no?: StringNullableFilter<"employees"> | string | null
    bank_name?: StringNullableFilter<"employees"> | string | null
    is_on_trial?: BoolNullableFilter<"employees"> | boolean | null
    has_telephone_allowance?: BoolNullableFilter<"employees"> | boolean | null
    position_allowance?: DecimalNullableFilter<"employees"> | Decimal | DecimalJsLike | number | string | null
    address?: StringNullableFilter<"employees"> | string | null
    national_id_card?: StringNullableFilter<"employees"> | string | null
    salary_type?: StringNullableFilter<"employees"> | string | null
    line_user_id?: StringNullableFilter<"employees"> | string | null
    is_checkin_exempt?: BoolNullableFilter<"employees"> | boolean | null
    probation_end_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    resignation_date?: DateTimeNullableFilter<"employees"> | Date | string | null
    created_at?: DateTimeNullableFilter<"employees"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"employees"> | Date | string | null
  }

  export type employeesUpsertWithoutSecondary_subordinatesInput = {
    update: XOR<employeesUpdateWithoutSecondary_subordinatesInput, employeesUncheckedUpdateWithoutSecondary_subordinatesInput>
    create: XOR<employeesCreateWithoutSecondary_subordinatesInput, employeesUncheckedCreateWithoutSecondary_subordinatesInput>
    where?: employeesWhereInput
  }

  export type employeesUpdateToOneWithWhereWithoutSecondary_subordinatesInput = {
    where?: employeesWhereInput
    data: XOR<employeesUpdateWithoutSecondary_subordinatesInput, employeesUncheckedUpdateWithoutSecondary_subordinatesInput>
  }

  export type employeesUpdateWithoutSecondary_subordinatesInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
  }

  export type employeesUncheckedUpdateWithoutSecondary_subordinatesInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
  }

  export type employeesUpsertWithWhereUniqueWithoutSecondary_supervisorInput = {
    where: employeesWhereUniqueInput
    update: XOR<employeesUpdateWithoutSecondary_supervisorInput, employeesUncheckedUpdateWithoutSecondary_supervisorInput>
    create: XOR<employeesCreateWithoutSecondary_supervisorInput, employeesUncheckedCreateWithoutSecondary_supervisorInput>
  }

  export type employeesUpdateWithWhereUniqueWithoutSecondary_supervisorInput = {
    where: employeesWhereUniqueInput
    data: XOR<employeesUpdateWithoutSecondary_supervisorInput, employeesUncheckedUpdateWithoutSecondary_supervisorInput>
  }

  export type employeesUpdateManyWithWhereWithoutSecondary_supervisorInput = {
    where: employeesScalarWhereInput
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyWithoutSecondary_supervisorInput>
  }

  export type employeesCreateWithoutDepartmentsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    job_positions?: job_positionsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateWithoutDepartmentsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesCreateOrConnectWithoutDepartmentsInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput>
  }

  export type employeesCreateManyDepartmentsInputEnvelope = {
    data: employeesCreateManyDepartmentsInput | employeesCreateManyDepartmentsInput[]
    skipDuplicates?: boolean
  }

  export type job_positionsCreateWithoutDepartmentsInput = {
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutJob_positionsInput
    parent?: job_positionsCreateNestedOneWithoutChildrenInput
    children?: job_positionsCreateNestedManyWithoutParentInput
  }

  export type job_positionsUncheckedCreateWithoutDepartmentsInput = {
    id?: number
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutJob_positionsInput
    children?: job_positionsUncheckedCreateNestedManyWithoutParentInput
  }

  export type job_positionsCreateOrConnectWithoutDepartmentsInput = {
    where: job_positionsWhereUniqueInput
    create: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput>
  }

  export type job_positionsCreateManyDepartmentsInputEnvelope = {
    data: job_positionsCreateManyDepartmentsInput | job_positionsCreateManyDepartmentsInput[]
    skipDuplicates?: boolean
  }

  export type employeesUpsertWithWhereUniqueWithoutDepartmentsInput = {
    where: employeesWhereUniqueInput
    update: XOR<employeesUpdateWithoutDepartmentsInput, employeesUncheckedUpdateWithoutDepartmentsInput>
    create: XOR<employeesCreateWithoutDepartmentsInput, employeesUncheckedCreateWithoutDepartmentsInput>
  }

  export type employeesUpdateWithWhereUniqueWithoutDepartmentsInput = {
    where: employeesWhereUniqueInput
    data: XOR<employeesUpdateWithoutDepartmentsInput, employeesUncheckedUpdateWithoutDepartmentsInput>
  }

  export type employeesUpdateManyWithWhereWithoutDepartmentsInput = {
    where: employeesScalarWhereInput
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyWithoutDepartmentsInput>
  }

  export type job_positionsUpsertWithWhereUniqueWithoutDepartmentsInput = {
    where: job_positionsWhereUniqueInput
    update: XOR<job_positionsUpdateWithoutDepartmentsInput, job_positionsUncheckedUpdateWithoutDepartmentsInput>
    create: XOR<job_positionsCreateWithoutDepartmentsInput, job_positionsUncheckedCreateWithoutDepartmentsInput>
  }

  export type job_positionsUpdateWithWhereUniqueWithoutDepartmentsInput = {
    where: job_positionsWhereUniqueInput
    data: XOR<job_positionsUpdateWithoutDepartmentsInput, job_positionsUncheckedUpdateWithoutDepartmentsInput>
  }

  export type job_positionsUpdateManyWithWhereWithoutDepartmentsInput = {
    where: job_positionsScalarWhereInput
    data: XOR<job_positionsUpdateManyMutationInput, job_positionsUncheckedUpdateManyWithoutDepartmentsInput>
  }

  export type job_positionsScalarWhereInput = {
    AND?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
    OR?: job_positionsScalarWhereInput[]
    NOT?: job_positionsScalarWhereInput | job_positionsScalarWhereInput[]
    id?: IntFilter<"job_positions"> | number
    department_id?: IntNullableFilter<"job_positions"> | number | null
    parent_id?: IntNullableFilter<"job_positions"> | number | null
    title?: StringFilter<"job_positions"> | string
    node_type?: StringNullableFilter<"job_positions"> | string | null
    order_index?: IntNullableFilter<"job_positions"> | number | null
    is_ot_eligible?: BoolFilter<"job_positions"> | boolean
    created_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"job_positions"> | Date | string | null
  }

  export type employeesCreateWithoutJob_positionsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    departments?: departmentsCreateNestedOneWithoutEmployeesInput
    supervisor?: employeesCreateNestedOneWithoutSubordinatesInput
    subordinates?: employeesCreateNestedManyWithoutSupervisorInput
    secondary_supervisor?: employeesCreateNestedOneWithoutSecondary_subordinatesInput
    secondary_subordinates?: employeesCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesUncheckedCreateWithoutJob_positionsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
    subordinates?: employeesUncheckedCreateNestedManyWithoutSupervisorInput
    secondary_subordinates?: employeesUncheckedCreateNestedManyWithoutSecondary_supervisorInput
  }

  export type employeesCreateOrConnectWithoutJob_positionsInput = {
    where: employeesWhereUniqueInput
    create: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput>
  }

  export type employeesCreateManyJob_positionsInputEnvelope = {
    data: employeesCreateManyJob_positionsInput | employeesCreateManyJob_positionsInput[]
    skipDuplicates?: boolean
  }

  export type departmentsCreateWithoutJob_positionsInput = {
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsUncheckedCreateWithoutJob_positionsInput = {
    id?: number
    name: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutDepartmentsInput
  }

  export type departmentsCreateOrConnectWithoutJob_positionsInput = {
    where: departmentsWhereUniqueInput
    create: XOR<departmentsCreateWithoutJob_positionsInput, departmentsUncheckedCreateWithoutJob_positionsInput>
  }

  export type job_positionsCreateWithoutChildrenInput = {
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutJob_positionsInput
    departments?: departmentsCreateNestedOneWithoutJob_positionsInput
    parent?: job_positionsCreateNestedOneWithoutChildrenInput
  }

  export type job_positionsUncheckedCreateWithoutChildrenInput = {
    id?: number
    department_id?: number | null
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutJob_positionsInput
  }

  export type job_positionsCreateOrConnectWithoutChildrenInput = {
    where: job_positionsWhereUniqueInput
    create: XOR<job_positionsCreateWithoutChildrenInput, job_positionsUncheckedCreateWithoutChildrenInput>
  }

  export type job_positionsCreateWithoutParentInput = {
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesCreateNestedManyWithoutJob_positionsInput
    departments?: departmentsCreateNestedOneWithoutJob_positionsInput
    children?: job_positionsCreateNestedManyWithoutParentInput
  }

  export type job_positionsUncheckedCreateWithoutParentInput = {
    id?: number
    department_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
    employees?: employeesUncheckedCreateNestedManyWithoutJob_positionsInput
    children?: job_positionsUncheckedCreateNestedManyWithoutParentInput
  }

  export type job_positionsCreateOrConnectWithoutParentInput = {
    where: job_positionsWhereUniqueInput
    create: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput>
  }

  export type job_positionsCreateManyParentInputEnvelope = {
    data: job_positionsCreateManyParentInput | job_positionsCreateManyParentInput[]
    skipDuplicates?: boolean
  }

  export type employeesUpsertWithWhereUniqueWithoutJob_positionsInput = {
    where: employeesWhereUniqueInput
    update: XOR<employeesUpdateWithoutJob_positionsInput, employeesUncheckedUpdateWithoutJob_positionsInput>
    create: XOR<employeesCreateWithoutJob_positionsInput, employeesUncheckedCreateWithoutJob_positionsInput>
  }

  export type employeesUpdateWithWhereUniqueWithoutJob_positionsInput = {
    where: employeesWhereUniqueInput
    data: XOR<employeesUpdateWithoutJob_positionsInput, employeesUncheckedUpdateWithoutJob_positionsInput>
  }

  export type employeesUpdateManyWithWhereWithoutJob_positionsInput = {
    where: employeesScalarWhereInput
    data: XOR<employeesUpdateManyMutationInput, employeesUncheckedUpdateManyWithoutJob_positionsInput>
  }

  export type departmentsUpsertWithoutJob_positionsInput = {
    update: XOR<departmentsUpdateWithoutJob_positionsInput, departmentsUncheckedUpdateWithoutJob_positionsInput>
    create: XOR<departmentsCreateWithoutJob_positionsInput, departmentsUncheckedCreateWithoutJob_positionsInput>
    where?: departmentsWhereInput
  }

  export type departmentsUpdateToOneWithWhereWithoutJob_positionsInput = {
    where?: departmentsWhereInput
    data: XOR<departmentsUpdateWithoutJob_positionsInput, departmentsUncheckedUpdateWithoutJob_positionsInput>
  }

  export type departmentsUpdateWithoutJob_positionsInput = {
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutDepartmentsNestedInput
  }

  export type departmentsUncheckedUpdateWithoutJob_positionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutDepartmentsNestedInput
  }

  export type job_positionsUpsertWithoutChildrenInput = {
    update: XOR<job_positionsUpdateWithoutChildrenInput, job_positionsUncheckedUpdateWithoutChildrenInput>
    create: XOR<job_positionsCreateWithoutChildrenInput, job_positionsUncheckedCreateWithoutChildrenInput>
    where?: job_positionsWhereInput
  }

  export type job_positionsUpdateToOneWithWhereWithoutChildrenInput = {
    where?: job_positionsWhereInput
    data: XOR<job_positionsUpdateWithoutChildrenInput, job_positionsUncheckedUpdateWithoutChildrenInput>
  }

  export type job_positionsUpdateWithoutChildrenInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutJob_positionsNestedInput
    departments?: departmentsUpdateOneWithoutJob_positionsNestedInput
    parent?: job_positionsUpdateOneWithoutChildrenNestedInput
  }

  export type job_positionsUncheckedUpdateWithoutChildrenInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutJob_positionsNestedInput
  }

  export type job_positionsUpsertWithWhereUniqueWithoutParentInput = {
    where: job_positionsWhereUniqueInput
    update: XOR<job_positionsUpdateWithoutParentInput, job_positionsUncheckedUpdateWithoutParentInput>
    create: XOR<job_positionsCreateWithoutParentInput, job_positionsUncheckedCreateWithoutParentInput>
  }

  export type job_positionsUpdateWithWhereUniqueWithoutParentInput = {
    where: job_positionsWhereUniqueInput
    data: XOR<job_positionsUpdateWithoutParentInput, job_positionsUncheckedUpdateWithoutParentInput>
  }

  export type job_positionsUpdateManyWithWhereWithoutParentInput = {
    where: job_positionsScalarWhereInput
    data: XOR<job_positionsUpdateManyMutationInput, job_positionsUncheckedUpdateManyWithoutParentInput>
  }

  export type employeesCreateManySupervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type employeesCreateManySecondary_supervisorInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    job_position_id?: number | null
    supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type employeesUpdateWithoutSupervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateWithoutSupervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateManyWithoutSupervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type employeesUpdateWithoutSecondary_supervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateWithoutSecondary_supervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateManyWithoutSecondary_supervisorInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type employeesCreateManyDepartmentsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    job_position_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type job_positionsCreateManyDepartmentsInput = {
    id?: number
    parent_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type employeesUpdateWithoutDepartmentsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    job_positions?: job_positionsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateWithoutDepartmentsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateManyWithoutDepartmentsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    job_position_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type job_positionsUpdateWithoutDepartmentsInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutJob_positionsNestedInput
    parent?: job_positionsUpdateOneWithoutChildrenNestedInput
    children?: job_positionsUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateWithoutDepartmentsInput = {
    id?: IntFieldUpdateOperationsInput | number
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutJob_positionsNestedInput
    children?: job_positionsUncheckedUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateManyWithoutDepartmentsInput = {
    id?: IntFieldUpdateOperationsInput | number
    parent_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type employeesCreateManyJob_positionsInput = {
    emp_id: string
    name: string
    nickname?: string | null
    pin_hash?: string | null
    is_active: boolean
    department_id?: number | null
    supervisor_id?: string | null
    secondary_supervisor_id?: string | null
    phone_number?: string | null
    email?: string | null
    branch_id?: string | null
    gender?: string | null
    hire_date?: Date | string | null
    birth_date?: Date | string | null
    base_salary?: Decimal | DecimalJsLike | number | string | null
    otp_code?: string | null
    otp_expires_at?: Date | string | null
    bank_account_no?: string | null
    bank_name?: string | null
    is_on_trial?: boolean | null
    has_telephone_allowance?: boolean | null
    position_allowance?: Decimal | DecimalJsLike | number | string | null
    address?: string | null
    national_id_card?: string | null
    salary_type?: string | null
    line_user_id?: string | null
    is_checkin_exempt?: boolean | null
    probation_end_date?: Date | string | null
    resignation_date?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type job_positionsCreateManyParentInput = {
    id?: number
    department_id?: number | null
    title: string
    node_type?: string | null
    order_index?: number | null
    is_ot_eligible?: boolean
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type employeesUpdateWithoutJob_positionsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    departments?: departmentsUpdateOneWithoutEmployeesNestedInput
    supervisor?: employeesUpdateOneWithoutSubordinatesNestedInput
    subordinates?: employeesUpdateManyWithoutSupervisorNestedInput
    secondary_supervisor?: employeesUpdateOneWithoutSecondary_subordinatesNestedInput
    secondary_subordinates?: employeesUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateWithoutJob_positionsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subordinates?: employeesUncheckedUpdateManyWithoutSupervisorNestedInput
    secondary_subordinates?: employeesUncheckedUpdateManyWithoutSecondary_supervisorNestedInput
  }

  export type employeesUncheckedUpdateManyWithoutJob_positionsInput = {
    emp_id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    pin_hash?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: BoolFieldUpdateOperationsInput | boolean
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    secondary_supervisor_id?: NullableStringFieldUpdateOperationsInput | string | null
    phone_number?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    branch_id?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableStringFieldUpdateOperationsInput | string | null
    hire_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    birth_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    base_salary?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    otp_code?: NullableStringFieldUpdateOperationsInput | string | null
    otp_expires_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bank_account_no?: NullableStringFieldUpdateOperationsInput | string | null
    bank_name?: NullableStringFieldUpdateOperationsInput | string | null
    is_on_trial?: NullableBoolFieldUpdateOperationsInput | boolean | null
    has_telephone_allowance?: NullableBoolFieldUpdateOperationsInput | boolean | null
    position_allowance?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    national_id_card?: NullableStringFieldUpdateOperationsInput | string | null
    salary_type?: NullableStringFieldUpdateOperationsInput | string | null
    line_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    is_checkin_exempt?: NullableBoolFieldUpdateOperationsInput | boolean | null
    probation_end_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    resignation_date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type job_positionsUpdateWithoutParentInput = {
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUpdateManyWithoutJob_positionsNestedInput
    departments?: departmentsUpdateOneWithoutJob_positionsNestedInput
    children?: job_positionsUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateWithoutParentInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employees?: employeesUncheckedUpdateManyWithoutJob_positionsNestedInput
    children?: job_positionsUncheckedUpdateManyWithoutParentNestedInput
  }

  export type job_positionsUncheckedUpdateManyWithoutParentInput = {
    id?: IntFieldUpdateOperationsInput | number
    department_id?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    node_type?: NullableStringFieldUpdateOperationsInput | string | null
    order_index?: NullableIntFieldUpdateOperationsInput | number | null
    is_ot_eligible?: BoolFieldUpdateOperationsInput | boolean
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}